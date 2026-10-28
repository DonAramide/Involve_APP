#!/bin/bash
set -eu
docker-entrypoint.sh postgres >/tmp/pg.log 2>&1 &
i=0
while [ "$i" -lt 40 ]; do
  pg_isready -U postgres && break
  i=$((i+1))
  sleep 0.5
done
psql -U postgres -v ON_ERROR_STOP=1 -f /sql/_disposable_hw_invify_catalogue_stub.sql
psql -U postgres -v ON_ERROR_STOP=1 -f /sql/DO_NOT_APPLY_hw_invify_catalogue.sql
psql -U postgres -v ON_ERROR_STOP=1 -f /sql/DO_NOT_APPLY_hw_invify_catalogue_audit_lockdown.sql
psql -U postgres -v ON_ERROR_STOP=1 -f /sql/_disposable_hw_invify_catalogue_integrity.sql
echo INTEGRITY_OK