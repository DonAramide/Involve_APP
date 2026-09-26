/** Trigger a browser file download that works after async fetch. */
export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function toCsv(headers, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.map(esc).join(','),
    ...rows.map((row) => headers.map((h) => esc(row[h])).join(',')),
  ];
  return `\uFEFF${lines.join('\r\n')}`;
}

function pdfEscape(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x09\x20-\x7E]/g, ' ');
}

/** Minimal one-page PDF (Helvetica) — no extra npm dependency. */
export function buildSimplePdf({ title, subtitle, lines }) {
  const commands = [];
  let y = 800;
  const push = (size, text) => {
    if (y < 40) return;
    commands.push(`BT /F1 ${size} Tf 40 ${y} Td (${pdfEscape(text).slice(0, 110)}) Tj ET`);
    y -= size === 16 ? 22 : 13;
  };
  push(16, title || 'Invify Report');
  push(9, subtitle || new Date().toISOString());
  y -= 6;
  for (const line of lines || []) {
    if (y < 40) {
      push(9, '...truncated');
      break;
    }
    push(9, line);
  }
  const stream = commands.join('\n');
  const objects = [];
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
  objects.push(
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
  );
  objects.push(
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  );
  objects.push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');

  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(body.length);
    body += `${obj}\n`;
  }
  const xrefPos = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return new Blob([body], { type: 'application/pdf' });
}

export async function sha256Hex(text) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'unavailable';
  }
}

export function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export function slugFile(title, format) {
  const slug = String(title || 'report')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  const stamp = new Date().toISOString().slice(0, 10);
  return `invify-${slug}-${stamp}.${format === 'PDF' ? 'pdf' : 'csv'}`;
}
