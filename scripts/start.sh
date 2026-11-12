#!/bin/sh
set -eu
cd /app/backend
python /app/backend/migrate.py
if [ "${SEED_DEMO:-false}" = "true" ]; then
  python -m flask --app wsgi seed-demo
fi
exec gunicorn --bind "0.0.0.0:${PORT:-10000}" --workers 1 --threads 4 --timeout 60 --access-logfile - --error-logfile - wsgi:app
