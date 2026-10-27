import { Request, Response } from 'express';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import { BuildVariantService } from '../config/build-variant';

const UNIT = 'invify-staging-backend.service';
const PORT = Number(process.env.PORT || 3004);
const PUBLIC_BASE = process.env.INVIFY_STAGING_PUBLIC_URL || 'https://staging.invify.org';

const SECRET_LINE = /password|passwd|secret|token|api[_-]?key|private[_-]?key|authorization|EnvironmentFile=|Environment=/i;

function redact(text: string): string {
  return String(text || '')
    .split('\n')
    .filter((line) => !SECRET_LINE.test(line))
    .map((line) => line.replace(/\?[^\s]*/g, '?…'))
    .join('\n')
    .slice(0, 8000);
}

function execReadonly(cmd: string, args: string[], timeoutMs = 2500): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
      const out = String(stdout || '').trim();
      const errText = String(stderr || err?.message || '').trim();
      resolve(redact(out || errText || 'unavailable'));
    });
  });
}

function probeLocal(path: string): Promise<{ url: string; status: number | null; body: string }> {
  const url = `http://127.0.0.1:${PORT}${path}`;
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 4000 }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(Buffer.from(c)));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8').slice(0, 240);
        resolve({ url, status: res.statusCode || null, body: redact(raw) });
      });
    });
    req.on('error', (err) => resolve({ url, status: null, body: redact(err.message) }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, status: null, body: 'timeout' });
    });
  });
}

function readLogSample(file: string) {
  try {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return { file, readable: false, note: 'missing' };
    }
    const raw = fs.readFileSync(file, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    const sample = lines.slice(-300);
    const counts = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    const bad: string[] = [];
    for (const line of sample) {
      const m = line.match(/" ([1-5][0-9][0-9]) /) || line.match(/\s([1-5][0-9][0-9])\s/);
      if (!m) continue;
      const cls = `${m[1][0]}xx` as keyof typeof counts;
      if (counts[cls] !== undefined) counts[cls] += 1;
      if (cls === '4xx' || cls === '5xx') bad.push(redact(line).slice(0, 180));
    }
    return {
      file,
      readable: true,
      sampled: sample.length,
      counts,
      recentErrors: bad.slice(-5),
      tail: sample.slice(-6).map((l) => redact(l).slice(0, 180)),
    };
  } catch (err: any) {
    return { file, readable: false, note: redact(err?.message || 'not readable') };
  }
}

function parseSystemctlShow(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of String(text || '').split('\n')) {
    const i = line.indexOf('=');
    if (i <= 0) continue;
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

export class StagingHostMonitorController {
  static async snapshot(req: Request, res: Response) {
    const variant = BuildVariantService.getInstance().getVariant();
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    const [isActive, showRaw, journal, localLivez, localReadyz, localHealth] = await Promise.all([
      execReadonly('systemctl', ['is-active', UNIT]).catch(() => 'unavailable'),
      execReadonly('systemctl', [
        'show',
        UNIT,
        '-p', 'ActiveState',
        '-p', 'SubState',
        '-p', 'MainPID',
        '-p', 'NRestarts',
        '-p', 'Result',
        '-p', 'ActiveEnterTimestamp',
        '-p', 'ExecMainStatus',
      ]).catch(() => 'unavailable'),
      execReadonly('journalctl', ['-u', UNIT, '-n', '20', '--no-pager', '-o', 'short-iso']).catch(() => 'unavailable'),
      probeLocal('/api/livez'),
      probeLocal('/api/readyz'),
      probeLocal('/api/health'),
    ]);

    const show = parseSystemctlShow(showRaw);
    const active = show.ActiveState || isActive || 'unknown';
    const result = show.Result || 'unknown';
    let crashState = 'unknown';
    if (active === 'active') crashState = `running (restarts recorded: ${show.NRestarts || '0'})`;
    else if (active === 'failed' || result === 'crash' || result === 'signal') crashState = `FAILED / crash-like (result=${result})`;
    else if (showRaw.includes('unavailable') || showRaw.includes('not found')) crashState = 'systemd not visible to this process';
    else crashState = `not running (active=${active} result=${result})`;

    const nginxCandidates = [
      '/var/log/nginx/access.log',
      '/var/log/nginx/error.log',
      '/var/log/nginx/staging.invify.org.access.log',
      '/var/log/nginx/staging.invify.org.error.log',
      '/var/log/nginx/invify-staging.access.log',
      '/var/log/nginx/invify-staging.error.log',
    ];
    const nginx = nginxCandidates.map(readLogSample).filter((x) => x.readable || x.note !== 'missing');

    return res.status(200).json({
      environment: 'STAGING',
      processVariant: variant,
      policy: 'READ-ONLY — no restart / reload / deploy / kill',
      timestamp: new Date().toISOString(),
      host: {
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        cores: os.cpus()?.length || 0,
        loadavg: os.loadavg(),
        uptimeSec: Math.round(os.uptime()),
      },
      service: {
        unit: UNIT,
        active,
        subState: show.SubState || null,
        mainPid: show.MainPID || String(process.pid),
        nRestarts: show.NRestarts || null,
        result,
        activeSince: show.ActiveEnterTimestamp || null,
        execMainStatus: show.ExecMainStatus || null,
        crashState,
      },
      node: {
        pid: process.pid,
        port: PORT,
        node: process.version,
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      },
      resources: {
        cpuLoad: os.loadavg(),
        ram: {
          totalMb: Math.round(totalMem / 1024 / 1024),
          usedMb: Math.round((totalMem - freeMem) / 1024 / 1024),
          freeMb: Math.round(freeMem / 1024 / 1024),
          usedPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
        },
        disks: os.platform() === 'win32'
          ? []
          : await StagingHostMonitorController.readDisks(),
      },
      probes: {
        local: [localLivez, localReadyz, localHealth],
        publicBase: PUBLIC_BASE,
      },
      journal: {
        unit: UNIT,
        lines: String(journal || '')
          .split('\n')
          .map((l) => redact(l))
          .filter(Boolean)
          .slice(-20),
      },
      nginx,
      readOnly: true,
    });
  }

  private static async readDisks() {
    const text = await execReadonly('df', ['-k', '-x', 'tmpfs', '-x', 'devtmpfs', '-x', 'squashfs']);
    const lines = text.split('\n').slice(1);
    return lines
      .map((line) => line.trim().split(/\s+/))
      .filter((cols) => cols.length >= 6)
      .map((cols) => ({
        filesystem: cols[0],
        sizeMb: Math.round(Number(cols[1] || 0) / 1024),
        usedMb: Math.round(Number(cols[2] || 0) / 1024),
        availMb: Math.round(Number(cols[3] || 0) / 1024),
        usedPercent: cols[4],
        mount: cols[5],
      }))
      .slice(0, 12);
  }
}
