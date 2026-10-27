#!/usr/bin/env bash
# INVIFY — STAGING REAL-TIME MONITORING
# Read-only. Never restart, reload, deploy, kill, modify, or enable/disable services.
# Never prints environment-file contents or secret values.
#
# This script is intended to run on the staging host (or via SSH stdin).
# It writes nothing to disk.

set -u

ENV_NAME="STAGING"
UNIT="invify-staging-backend.service"
PORT="3004"
PUBLIC_BASE="${INVIFY_STAGING_PUBLIC_URL:-https://staging.invify.org}"
LOCAL_BASE="http://127.0.0.1:${PORT}"
INTERVAL="${INVIFY_MONITOR_INTERVAL:-5}"
MODE="once"

usage() {
  cat <<'EOF'
INVIFY — STAGING REAL-TIME MONITORING (read-only)

One-shot diagnostic:
  bash scripts/staging-realtime-monitor.sh --once

Continuous real-time monitor:
  bash scripts/staging-realtime-monitor.sh --watch

From Windows (SSH, nothing written on the server):
  powershell -File scripts/Invoke-StagingRealtimeMonitor.ps1 -Mode once
  powershell -File scripts/Invoke-StagingRealtimeMonitor.ps1 -Mode watch

Options:
  --once          Print one snapshot and exit (default)
  --watch         Refresh continuously
  --interval N    Watch interval in seconds (default 5)
  --help          Show this help

This utility never runs systemctl start/stop/restart/reload/enable/disable,
never kills processes, and never reads environment files.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --once) MODE="once" ;;
    --watch) MODE="watch" ;;
    --interval)
      shift
      INTERVAL="${1:-5}"
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --restart|--reload|--deploy|--kill|--enable|--disable|--start|--stop)
      echo "Refused: this monitor is read-only and will not $1 anything." >&2
      exit 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

case "$INTERVAL" in
  ''|*[!0-9]*) INTERVAL=5 ;;
esac
if [ "$INTERVAL" -lt 2 ]; then
  INTERVAL=2
fi

refuse_if_not_staging() {
  local host
  host="$(hostname 2>/dev/null || echo unknown)"
  case "$host" in
    *prod*|*production*)
      echo "Refused: hostname '$host' looks like production. This monitor is STAGING only." >&2
      exit 2
      ;;
  esac
  case "$UNIT" in
    *staging*) ;;
    *)
      echo "Refused: unit '$UNIT' is not a staging unit." >&2
      exit 2
      ;;
  esac
}

hr() {
  printf '%s\n' "----------------------------------------------------------------"
}

banner() {
  printf '%s\n' ""
  printf '%s\n' "================================================================"
  printf '%s\n' "  INVIFY — STAGING REAL-TIME MONITORING"
  printf '%s\n' "  Environment : ${ENV_NAME}   (not production)"
  printf '%s\n' "  Mode        : ${MODE}    |  generated $(date -u '+%Y-%m-%dT%H:%M:%SZ') UTC"
  printf '%s\n' "  Policy      : READ-ONLY — no restart / reload / deploy / kill"
  printf '%s\n' "================================================================"
}

redact() {
  # Drop lines that look like secrets; never dump env files.
  sed -E \
    -e '/EnvironmentFile=/d' \
    -e '/Environment=/d' \
    -e '/password|passwd|secret|token|api[_-]?key|private[_-]?key|authorization/Id'
}

have() {
  command -v "$1" >/dev/null 2>&1
}

section() {
  printf '\n%s\n' "--- $1 ---"
}

probe() {
  local url="$1"
  local body code
  if ! have curl; then
    printf '  %-48s  %s\n' "$url" "curl not available"
    return
  fi
  body="$(curl -sS -m 5 -w '\n%{http_code}' "$url" 2>/dev/null || true)"
  if [ -z "$body" ]; then
    printf '  %-48s  %s\n' "$url" "NO RESPONSE"
    return
  fi
  code="$(printf '%s' "$body" | tail -n 1)"
  body="$(printf '%s' "$body" | sed '$d')"
  body="$(printf '%s' "$body" | redact | tr '\n' ' ' | cut -c1-160)"
  printf '  %-48s  HTTP %s  %s\n' "$url" "$code" "$body"
}

count_http_classes() {
  local file="$1"
  local lines="${2:-200}"
  if [ ! -r "$file" ]; then
    printf '  %s: not readable (permission or missing)\n' "$file"
    return
  fi
  # Access-log status is typically field 9. Fall back to any standalone 3-digit token.
  awk -v n="$lines" '
    { rec[++c] = $0 }
    END {
      start = c-n+1; if (start < 1) start = 1
      for (i = start; i <= c; i++) {
        line = rec[i]
        status = ""
        if (match(line, /" [1-5][0-9][0-9] /)) {
          status = substr(line, RSTART+2, 3)
        } else {
          nfields = split(line, f, /[[:space:]]+/)
          if (nfields >= 9 && f[9] ~ /^[1-5][0-9][0-9]$/) status = f[9]
        }
        if (status == "") continue
        total++
        cls = substr(status, 1, 1) "xx"
        count[cls]++
        if (cls == "4xx" || cls == "5xx") {
          bad[++b] = status "  " line
        }
      }
      printf "  file=%s  sampled_last=%d  2xx=%d  3xx=%d  4xx=%d  5xx=%d\n",
        FILENAME, total+0, count["2xx"]+0, count["3xx"]+0, count["4xx"]+0, count["5xx"]+0
      if (b) {
        printf "  recent 4xx/5xx (last %d, query-stripped):\n", (b>5?5:b)
        for (i = (b>5?b-4:1); i <= b; i++) {
          line = bad[i]
          gsub(/\?[^[:space:]]*/, "?…", line)
          print "    " substr(line, 1, 180)
        }
      }
    }
  ' "$file"
}

show_log_tail() {
  local file="$1"
  local n="${2:-8}"
  if [ ! -r "$file" ]; then
    printf '  %s: not readable (permission or missing)\n' "$file"
    return
  fi
  printf '  last %s lines of %s:\n' "$n" "$file"
  tail -n "$n" "$file" 2>/dev/null | redact | sed -E 's/\?[^[:space:]]*/?…/g' | sed 's/^/    /'
}

snapshot() {
  refuse_if_not_staging
  banner

  local host
  host="$(hostname 2>/dev/null || echo unknown)"
  printf '\nHost: %s  User: %s  Kernel: %s\n' \
    "$host" "${USER:-unknown}" "$(uname -srm 2>/dev/null || echo unknown)"

  section "Service: ${UNIT}"
  if have systemctl; then
    local active sub mainpid nrestarts result started status_code
    active="$(systemctl is-active "$UNIT" 2>/dev/null || echo unknown)"
    sub="$(systemctl show -p SubState --value "$UNIT" 2>/dev/null || echo unknown)"
    mainpid="$(systemctl show -p MainPID --value "$UNIT" 2>/dev/null || echo 0)"
    nrestarts="$(systemctl show -p NRestarts --value "$UNIT" 2>/dev/null || echo unknown)"
    result="$(systemctl show -p Result --value "$UNIT" 2>/dev/null || echo unknown)"
    started="$(systemctl show -p ActiveEnterTimestamp --value "$UNIT" 2>/dev/null || echo unknown)"
    status_code="$(systemctl show -p ExecMainStatus --value "$UNIT" 2>/dev/null || echo unknown)"
    printf '  active=%s  substate=%s  main_pid=%s  nrestarts=%s\n' "$active" "$sub" "$mainpid" "$nrestarts"
    printf '  last_result=%s  exec_main_status=%s\n' "$result" "$status_code"
    printf '  active_since=%s\n' "$started"
    if [ "$active" = "active" ]; then
      printf '  crash/restart: %s\n' "running (restarts recorded: ${nrestarts})"
    elif [ "$active" = "failed" ] || [ "$result" = "crash" ] || [ "$result" = "signal" ]; then
      printf '  crash/restart: FAILED / crash-like (result=%s)\n' "$result"
    else
      printf '  crash/restart: not running (active=%s result=%s)\n' "$active" "$result"
    fi
  else
    printf '  systemctl not available\n'
    mainpid="0"
  fi

  section "Node PID and port ${PORT}"
  local listeners pids
  listeners="$(ss -ltnp 2>/dev/null | grep -E ":${PORT}\\b" || netstat -ltnp 2>/dev/null | grep -E ":${PORT}\\b" || true)"
  if [ -n "$listeners" ]; then
    printf '%s\n' "$listeners" | sed 's/^/  /'
  else
    printf '  no listener found on port %s (or ss/netstat not permitted)\n' "$PORT"
  fi
  if [ "${mainpid:-0}" != "0" ] && [ -n "${mainpid:-}" ]; then
    if have ps; then
      ps -p "$mainpid" -o pid=,ppid=,user=,pcpu=,pmem=,etime=,cmd= 2>/dev/null \
        | sed 's/^/  process: /' || printf '  process %s not visible\n' "$mainpid"
    fi
  fi
  pids="$(pgrep -af 'node .*dist/app.js|node /srv/invify' 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    printf '  matching node processes:\n'
    printf '%s\n' "$pids" | redact | sed 's/^/    /'
  fi

  section "CPU"
  if [ -r /proc/loadavg ]; then
    printf '  loadavg: %s   cores: %s\n' "$(cat /proc/loadavg)" "$(nproc 2>/dev/null || echo '?')"
  fi
  if have top; then
    top -bn1 2>/dev/null | awk 'NR<=5 { print "  " $0 }'
  elif have vmstat; then
    vmstat 1 2 2>/dev/null | tail -n 1 | sed 's/^/  vmstat: /'
  fi

  section "RAM"
  if have free; then
    free -h | sed 's/^/  /'
  elif [ -r /proc/meminfo ]; then
    awk '/MemTotal|MemAvailable|MemFree|SwapTotal|SwapFree/ { print "  " $0 }' /proc/meminfo
  fi

  section "Disk"
  df -h -x tmpfs -x devtmpfs -x squashfs 2>/dev/null | sed 's/^/  /'

  section "Health probes (localhost:${PORT} and public staging)"
  probe "${LOCAL_BASE}/api/livez"
  probe "${LOCAL_BASE}/api/readyz"
  probe "${LOCAL_BASE}/api/health"
  probe "${LOCAL_BASE}/livez"
  probe "${LOCAL_BASE}/readyz"
  probe "${LOCAL_BASE}/health"
  probe "${PUBLIC_BASE}/api/livez"
  probe "${PUBLIC_BASE}/api/readyz"
  probe "${PUBLIC_BASE}/api/health"

  section "Backend systemd journal (redacted, last 20)"
  if have journalctl; then
    journal_out="$(journalctl -u "$UNIT" -n 20 --no-pager -o short-iso 2>&1 || true)"
    case "$journal_out" in
      *Permission\ denied*|*No\ journal\ files*|*not\ be\ read*)
        printf '  journal not readable without extra privileges (tried journalctl -u %s)\n' "$UNIT"
        ;;
      '')
        printf '  journal empty or unavailable for %s\n' "$UNIT"
        ;;
      *)
        printf '%s\n' "$journal_out" | redact | sed 's/^/  /'
        ;;
    esac
  else
    printf '  journalctl not available\n'
  fi

  section "Nginx access / error logs and HTTP 4xx/5xx"
  local found=0
  local candidate
  for candidate in \
    /var/log/nginx/access.log \
    /var/log/nginx/error.log \
    /var/log/nginx/staging.invify.org.access.log \
    /var/log/nginx/staging.invify.org.error.log \
    /var/log/nginx/invify-staging.access.log \
    /var/log/nginx/invify-staging.error.log \
    /var/log/nginx/staging-access.log \
    /var/log/nginx/staging-error.log
  do
    if [ -e "$candidate" ]; then
      found=1
      case "$candidate" in
        *error*) show_log_tail "$candidate" 6 ;;
        *) count_http_classes "$candidate" 300 ;;
      esac
    fi
  done
  if [ "$found" -eq 0 ]; then
    printf '  no nginx log files found at the usual paths (or not visible to this user)\n'
  fi

  hr
  printf 'End of %s snapshot. Read-only monitor — no service mutations performed.\n' "$ENV_NAME"
}

if [ "$MODE" = "watch" ]; then
  printf '%s\n' "INVIFY — STAGING REAL-TIME MONITORING  (continuous, every ${INTERVAL}s, Ctrl+C to stop)"
  while true; do
    if have clear; then
      clear
    else
      printf '\033[H\033[2J'
    fi
    snapshot
    printf '\nNext refresh in %ss. STAGING only. Read-only.\n' "$INTERVAL"
    sleep "$INTERVAL"
  done
else
  snapshot
fi
