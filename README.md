# AhaBridge · Intelligent Learning Recovery Studio

**From “I got it wrong” to “I can teach it right.”**

A React + TypeScript + Flask application for a teacher-guided recovery loop:
diagnostic → explainable evidence → approved practical bridge → reviewed teach-back → a distinct delayed Echo Check.
The core works without an LLM, paid API, background worker or file upload service.

## Run locally with Docker

Requirements: Docker Desktop with Linux containers and Compose.

```powershell
Copy-Item .env.example .env
# Edit .env: set independent random SECRET_KEY, POSTGRES_PASSWORD and DEMO_PASSWORD.
# SECRET_KEY: at least 32 characters. DEMO_PASSWORD: at least 12 characters.
# Use a URL-safe hexadecimal database password for the Compose connection string.
# Set DEMO_MODE=true and SEED_DEMO=true to install synthetic classrooms.
docker compose up --build -d
docker compose ps
docker compose logs backend
# If SEED_DEMO was false at first boot, seed explicitly:
docker compose exec -T -w /app/backend backend python -m flask --app wsgi seed-demo
```

Open [the app](http://localhost:5173). Flask is on port 5000 and PostgreSQL is on 5432, each bound to loopback. Compose supplies its own container database URL; your host's `.env` URL does not override it.

The application already has a generated, ignored `.env` in this workspace for the native local run. Keep that file private. Set `SEED_DEMO=true` to populate a new Docker database; the seed command never resets an existing school.

Demo sign-in identifiers (all use **your privately configured `DEMO_PASSWORD`**):

| Role | Identifier |
| --- | --- |
| Teacher | `teacher@demo.ahabridge.test` |
| Fresh learner | `student01@demo.ahabridge.test` |
| Other learners | `student02@demo.ahabridge.test` through `student14@demo.ahabridge.test` |
| Platform steward | `admin@demo.ahabridge.test` |

The public [demo tour](http://localhost:5173/demo) needs no credentials and reads only synthetic aggregates.

## Native development

Python 3.12+ and Node 22.19+ are supported. The implementation was also tested with Python 3.13.7. Provide a local PostgreSQL connection in `.env`. SQLite is supported for disposable tests and quick development only; production startup requires PostgreSQL.

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements.lock.txt
# If Windows ensurepip fails, use:
# python -m pip --python .venv/Scripts/python.exe install -r backend/requirements.lock.txt
.venv/Scripts/python.exe -m flask --app backend/wsgi.py db upgrade
.venv/Scripts/python.exe -m flask --app backend/wsgi.py seed-demo
.venv/Scripts/python.exe -m flask --app backend/wsgi.py run --host 127.0.0.1 --port 5000
```

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

The local PostgreSQL cluster prepared during implementation lives in `.local/pgdata`, bound to `127.0.0.1:55432`. It is development-only, uses local trust authentication and is ignored by Git and Docker. It does not change the system PostgreSQL service. Start/stop it using `scripts/local-postgres.ps1`. Production and Compose use password-protected databases.

## Verification

```powershell
.venv/Scripts/python.exe -m pytest backend/tests -q
# Use a dedicated EMPTY test database; fixtures create and drop their own tables:
$env:TEST_DATABASE_URL='postgresql+psycopg://user:password@localhost/ahabridge_test'
.venv/Scripts/python.exe -m pytest backend/tests -q
cd frontend
npm run typecheck
npm run lint
npm test
npm run build
```

Migration verification on a disposable database: `flask db upgrade`, `flask db downgrade base`, `flask db upgrade`. Never downgrade a school database without a verified backup. CI verifies PostgreSQL, the frontend, and the production Docker build.

With the local stack running, verify the real HTTP flow and production assets:

```powershell
.venv/Scripts/python.exe scripts/smoke.py http://localhost:5000
.venv/Scripts/python.exe scripts/e2e_smoke.py http://localhost:5000
# Separate production-environment startup check (health/static only over local HTTP):
docker compose -f compose.yaml -f compose.production.yaml up --build -d production
.venv/Scripts/python.exe scripts/smoke.py http://localhost:10000
```

The workflow smoke adds labelled synthetic diagnostic/mission records. Production cookies require HTTPS; use port 5173 or 5000 in the development stack for interactive local login. See the acceptance report for the four residual low-severity PWA build-chain advisories.

## School provisioning and operations

No public endpoint creates teachers or administrators. A trusted operator fulfils approved invitations using the CLI:

```powershell
.venv/Scripts/python.exe -m flask --app backend/wsgi.py provision --organization "School name" --email teacher@school.test --name "Teacher name" --role teacher
```

The CLI prompts privately for a password. Teachers create classrooms and issue student accounts from **Author & invite → Invite learners**. Existing school students can join another class using its teacher-issued code. New codes are returned once and stored only as hashes. Replacing a code revokes the earlier code.

Operators can run `purge-expired-sessions` and `delete-learner STUDENT_UUID`. Learner deletion prompts for confirmation and removes educational records, sessions and offline receipts. Clear cached data on each learner device too. School staff determine authorization, consent and retention before real use.

## Artwork

The exact attached PNG is retained at `reference_assets/aha-bulb-original.png` and copied unchanged to `frontend/src/assets/illustrations/aha-bulb-original.png`.

SHA-256: `146f0a90b53618b9d77c3f6f83b2978ebeb992a658f25c16d342caf965eee5f9`.

The bundler imports the image; Flask serves the resulting hashed asset. No generated substitute or background removal is used. The complete 2048×1655 opaque paper image is displayed with `object-fit: contain`. The hero moves as a whole, with reduced-motion support. Public publishing rights remain for the owner to verify.

## Product boundaries

Navigation labels and fraction bridge activities have authored English, Hindi and Odia versions. Other UI and curriculum content use a visible English fallback. A cached shell and explicitly saved exercises/missions support limited offline work; signing in, starting a new attempt, reviews, and Echo assessments require the server. Device work is bounded to 100 queued operations, 30 saved content entries and the current account. Sign-out wipes IndexedDB and private in-memory query data.

The implemented scope and remaining boundaries are recorded in [the acceptance report](docs/ACCEPTANCE.md). Render setup is in [DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md). See [API.md](docs/API.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md), [EDUCATIONAL_METHOD.md](docs/EDUCATIONAL_METHOD.md), and [DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).
