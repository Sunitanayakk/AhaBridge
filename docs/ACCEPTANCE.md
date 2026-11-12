# Implementation and acceptance report

12 November 2026. This report distinguishes executed checks from remaining product scope.

## Implemented routes

| Route | What works |
| --- | --- |
| `/` | Sketchbook landing, exact original image, working demo/login links, five-step links |
| `/demo` | Read-only persisted synthetic analytics, five interactive tour steps, concept drawer and table |
| `/login` | Zod + form validation, signed CSRF, role-aware navigation, errors |
| `/teacher` | Create/select classes, rotate private enrollment codes, actual atlas metrics, evidence drawer, thresholds |
| `/teacher/author` | Concepts/prerequisites, reviewed misconception tags, approved question bank, draft/publish sets, provision learners, paper response entry |
| `/teacher/bridges` | Concept/mode/language filters, original activity authoring, edit copies, approval, owned-student assignment, logged override rationale |
| `/teacher/reviews` | Scoped text/sketch review with four rubric scores and supportive feedback |
| `/teacher/impact` | Actual stage counts, delayed N/accuracy, accessible chart table, aggregate CSV export |
| `/teacher/print/:id` | Low-ink activities and key-free response sheets, browser Print / Save PDF |
| `/student` | Enrolled published diagnostics and class-code joining |
| `/student/exercise/:id` | Start/resume, confidence, exact option checking, immutable answers, submit and supportive feedback |
| `/student/missions` | Teacher-selected activities, completion, local explanation drafts, bounded structured drawing, submission and review feedback |
| `/student/echo` | Due/upcoming/completed distinct checks, explicit synthetic-only acceleration, no missed=failed label |
| `/admin` | Aggregate platform health and audited-action list |
| `/privacy`, unknown routes | Plain-language privacy and friendly 404 |

All mutating APIs enforce CSRF. Student and teacher resources enforce role, owner, organization and enrollment as applicable. Correct options are withheld from active student diagnostics and early Echo checks. No self-service elevated account creation exists.

## Executed verification

* Backend: **13 tests passed** on PostgreSQL, including the full learning loop, roles, cross-organization and colleague ownership, CSRF renewal/expiry, no early keys, exact option ownership, strict confidence booleans, immutable/idempotent replay, no premature Echo answer, no automatic mastery from completion and disabled non-demo clock fixture. The earlier 12-test baseline also passed on SQLite.
* Frontend: **11 tests passed**, including login validation and role navigation, confidence-required submission, empty atlas, keyboard evidence drawer, supplied image import and failure fallback, teach-back submission guard, and unassessed Echo empty state.
* Session regression: a missing/expired CSRF cookie can be refreshed in an otherwise active session. The browser retries only a CSRF-blocked mutation, once; authorization rejections are never silently replayed. Logout attempts local cleanup even if the server is unreachable, and explicitly warns when server revocation or device cleanup could not be confirmed.
* TypeScript check, ESLint and production Vite/PWA build passed. The final check is rerun after audit fixes.
* PostgreSQL migrations: upgrade → downgrade to base → upgrade succeeded in an isolated test database. The test database was then downgraded again; the application database was preserved.
* Multi-stage Docker image built successfully. Docker Compose PostgreSQL/API/frontend started; database and API health checks became healthy.
* Final backend suite also passed inside the Linux **Python 3.12 Docker runtime** against its own isolated PostgreSQL test database (13 tests).
* A separate `APP_ENV=production` container passed the same static/health/original-asset HTTP smoke on port 10000. It was stopped after verification; the main development stack remains running. No live Render URL is claimed.
* Real HTTP workflow on the local Docker API: teacher publishes two-question diagnostic → learner submits tagged confident wrong answers → teacher sees evidence → assigns an approved bridge → learner completes/submits explanation → teacher reviews → synthetic fixture advances only that Echo → learner answers distinct question → recovery insight changes. This adds explicitly labelled synthetic smoke records, separate from the fresh original diagnostic.
* HTTP static smoke: health, `/`, nested `/demo`, JSON API 404, bundled original image HTTP 200 and identical SHA-256 all passed. This check caught and fixed Flask's automatic static-route shadowing of nested SPA routes.
* Browser: landing and exact image inspected at 360, 390, 768, 1024 and 1440px. DOM measurements showed natural width 2048, `object-fit: contain`, preserved proportions, and no horizontal page overflow at all five widths. Screenshots are in `docs/screenshots/`.
* Browser: actual teacher sign-in, atlas, planner, reviewed explanations, impact, student sign-in and exercise navigation inspected. Broader permission/learning-loop assertions were executed through tests and the HTTP script rather than claimed from screenshots.

## Audit findings and fixes

| Feature | Expected | Finding | Severity | Fix / retest |
| --- | --- | --- | --- | --- |
| SPA production routing | Nested routes load | Flask automatic static catch-all returned 404 for `/demo` | P1 | Disabled automatic static dispatch; explicit safe asset/SPA dispatch; live HTTP smoke passed |
| Motion build | Reproducible production bundle | Transitive motion-dom changed incompatible exports | P1 | Pinned compatible motion-dom/motion-utils overrides; build and tests passed |
| Mutation ownership | Foreign work rejected | Required explicit classroom/student checks | P1 boundary | Implemented shared scoped access helpers; tenant, colleague and learner tests passed |
| Early assessment answers | No answer key while active | Needed separate author/student serialization | P1 boundary | Role-specific serializers and post-submit result endpoint; tests passed |
| Replay | No duplicate responses or stale overwrite | Queue keys can be reused | P1 boundary | User-scoped receipts, payload hash and immutable answer conflict; replay tests passed |
| Public tour | No staff identifiers or learner explanations | Activity approval field included staff UUID | P2 | Redacted public approval identifiers; test passed |
| Concept diagram | Edges reflect authored relationships | Adjacent decoration could imply an unauthored dependency | P2 | SVG connectors now derive from actual prerequisite IDs; accessible relationship list retained |
| Dependency audit | Current patched runtime/tooling | Earlier pins had known advisories | P1 | Upgraded affected packages and reran relevant checks; see below |

The npm audit after upgrades reported **0 critical, 0 high, 0 moderate**, with **4 low findings** in the transitive PWA build-tool chain (`deepmerge` and affected dependents). The published current deepmerge version remained affected; the suggested automatic resolution removes/reverts the current PWA chain. These tools process trusted build configuration and are not a runtime API dependency. This is a documented residual finding, not a claim of an independently certified secure product.

The full pinned Python lockfile was checked with `pip-audit --disable-pip --no-deps -r backend/requirements.lock.txt` after upgrading Flask to 3.1.3, pytest to 9.0.3, and python-dotenv to 1.2.2: **no known vulnerabilities found**. This advisory snapshot is time-bound and is not a substitute for continuing updates.

## Scope boundaries

* Original artwork is integrated unchanged; public publishing rights were not verified by this agent.
* English is the default. Navigation and fraction activities have authored Hindi/Odia variants; other content is visibly marked as English fallback. Full curriculum localization is not claimed.
* Offline is a bounded device cache/queue, not an offline backend. It needs a previously verified live session and a started exercise. Browser offline/reconnect behavior across every device/storage restriction has not been exhaustively tested. Teacher approvals and Echo answers stay online.
* Immediate post-test runner is absent. API reports no post assessment rather than inventing a score. Delayed checks and reviewed teach-backs are implemented.
* Admin organization/invitation operations use the operator CLI; the browser admin screen is aggregate health/audit only. No email invitations are sent.
* One diagnostic set is assigned to one classroom, with one attempt per learner. Author a new set for reassessment. Question versions are immutable; PATCH explicitly returns a conflict.
* No automated recommendation reorder, external AI drafting, audio/video, QR generator, browser speech or PDF server is claimed. Browser print can save a PDF.
* No Render deployment was performed. The Blueprint and instructions were checked against current official documentation. Actual plan/region/account configuration remains for deployment.
* This is a small-school/hackathon slice. A real pilot needs school content review, translated-content review, accessibility testing with users, backups/retention policy and operational capacity planning.
