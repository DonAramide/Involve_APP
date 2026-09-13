#!/bin/bash
set -e
echo "=== PUBLIC HOST POST ==="
curl -sS -i -X POST "https://staging.invify.org/api/webhooks/quasar" \
  -H "Content-Type: application/json" \
  -d '{}' | head -25
echo
echo "=== SPA PATH POST ==="
curl -sS -i -X POST "https://staging.invify.org/webhooks/quasar" \
  -H "Content-Type: application/json" \
  -d '{}' | head -12
echo
echo "=== SECRET LENS ==="
for f in /etc/invify-staging-backend.env /etc/invify/invify-staging.env; do
  echo "FILE $f"
  if [ -r "$f" ]; then
    awk -F= '
      $1=="QUASAR_WEBHOOK_SECRET" ||
      $1=="QUASAR_WEBHOOK_SIGNING_SECRET" ||
      $1=="STAGING_QUASAR_WEBHOOK_SECRET" ||
      $1=="STAGING_QUASAR_WEBHOOK_SIGNING_SECRET" {
        print $1, length($2)
      }
    ' "$f"
  else
    echo unreadable
  fi
done
echo "=== DNS ==="
getent hosts staging.invify.org || true
echo "=== CERT ==="
echo | openssl s_client -servername staging.invify.org -connect 127.0.0.1:443 2>/dev/null \
  | openssl x509 -noout -subject -dates 2>/dev/null | head -5
