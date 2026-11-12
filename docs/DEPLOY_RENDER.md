# Render deployment

Reference checked 12 November 2026: [Blueprint specification](https://render.com/docs/blueprint-spec), [free-instance limits](https://render.com/docs/free), [health checks](https://render.com/docs/health-checks).

The architecture is one Docker web service serving Flask and the Vite output on one origin, and one managed PostgreSQL database in Singapore. No disk, upload bucket or worker is required. The service binds `0.0.0.0:${PORT:-10000}`. `/api/v1/health` checks database connectivity.

## Before publishing

1. Verify rights to publish the supplied artwork. Confirm school authorization/consent and retention for real records. Use synthetic records for a public hackathon preview.
2. Run frontend tests/build, backend tests against PostgreSQL, migration upgrade/downgrade on a disposable database, and `docker build -t ahabridge:preview .`.
3. Keep `.env`, `.local`, databases and credentials out of Git. Inspect the repository before pushing.

## GitHub to Render

1. Create a GitHub repository and push this source, including the lockfiles and `render.yaml`.
2. In Render, choose **New → Blueprint**, connect GitHub, and select that repository and branch.
3. Review `ahabridge-web` and `ahabridge-db`. Verify actual plan and Singapore region availability in your account. The included free plans are preview defaults, not availability guarantees.
4. Approve resource creation. Render supplies a generated `SECRET_KEY` and the database's internal connection string. The app converts `postgres://` or `postgresql://` to `postgresql+psycopg://`.
5. Keep `DEMO_MODE=false` for a real school. To seed a synthetic preview, set `DEMO_MODE=true`, a private `DEMO_PASSWORD` (12+ characters), and `SEED_DEMO=true` in the service Environment settings, then deploy. After seeding, set `SEED_DEMO=false`. Clock fixtures remain available only to synthetic learner accounts while demo mode is enabled.
6. Inspect logs for migration completion and Gunicorn startup. Startup obtains a PostgreSQL advisory lock before running Alembic, with one service instance. For scaled/paid services use a controlled release migration step.
7. Open `/api/v1/health` and expect `{"status":"ok"}`. Open `/`, a nested route such as `/demo`, and the bundled `/assets/aha-bulb-original-<hash>.png`. Confirm each returns 200 and the image is the unchanged original. An unknown `/api/v1/...` must be JSON 404, not the SPA HTML.
8. Verify HTTPS session cookies (`Secure`, `HttpOnly`, `SameSite=Lax`), CSRF enforcement, teacher ownership, an actual student exercise, a bridge, teacher review and distinct due Echo Check. For a non-demo school, provision the first teacher using an authorized operator environment with the managed `DATABASE_URL` and documented `flask provision` command.

This repository is prepared for deployment; no Render service has been created or published by this implementation session.

## Free resources are a preview

Render's currently documented free web service spins down after **15 minutes without inbound traffic** and takes time to wake. Free PostgreSQL expires **30 days after creation**. Container files are ephemeral across restarts/deploys/spin-down. Plan on a cold start during a hackathon and do not store a SQLite database or uploads in the production container.

Before the database expiry date, upgrade to a suitable paid plan or export and migrate data. Do not assume free backups. Use PostgreSQL client tools with the connection supplied by Render, without pasting secrets into shared logs:

```bash
# DATABASE_URL supplied privately in the operator environment; use a PostgreSQL URL,
# without SQLAlchemy's +psycopg suffix, for pg_dump/pg_restore.
pg_dump --format=custom --file=ahabridge-backup.dump "$DATABASE_URL"
pg_restore --no-owner --dbname="$NEW_DATABASE_URL" ahabridge-backup.dump
```

Backups contain learner records: encrypt, access-restrict, and test restoration into an isolated database. Update Render's connection reference after verifying the new database. Paid plans should set backup retention and recovery objectives with the school.

## Rollback

Prefer a previous compatible image with the same forward-compatible schema. Back up before schema changes. Only run `flask db downgrade` after inspecting the migration and restoring/testing a backup; the initial downgrade removes all tables and is destructive. Never reset the live database to replay demo fixtures. Seed is insert-once, never an automatic wipe.

## Troubleshooting

* Startup rejects weak secret/SQLite: set a 32+ character `SECRET_KEY` and managed PostgreSQL `DATABASE_URL`.
* Login security error: use the same origin and HTTPS, get `/auth/csrf`, and send the cookie token in `X-CSRF-Token`. Do not use third-party browser cookie blocking workarounds.
* Missing demo: explicitly enable seeding, set a long private password, inspect logs, and disable seed after success.
* No Echo available: teacher must author an approved `echo` question for that concept with a different problem stem. Wait for due time or use the synthetic-only fixture in a demo account.
* Stale PWA: close old tabs and reload to adopt the new shell. API responses are never in Cache Storage. Conflicting offline mutations remain visible for manual discard, rather than overwriting server records.
* Native Windows ensurepip problem: use the parent pip's `--python .venv/Scripts/python.exe` installation command from the README.
