# AhaBridge API · `/api/v1`

JSON bodies only. Errors are `{error:{code,message,details},request_id}`. Responses use 401 for expired/missing authentication, 403 for role/CSRF failures, 404 for hidden/not-found resources, 409 for immutable/conflicting states, and 422 for invalid input. Private responses are `no-store`; request IDs appear in headers and errors. Lists return `items` and are bounded for the demo; no pagination contract is claimed.

## Session example

```bash
curl -c cookies.txt http://localhost:5000/api/v1/auth/csrf
# Read csrf_token from the JSON. Keep this temporary cookie file private.
curl -b cookies.txt -c cookies.txt -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"email":"teacher@demo.ahabridge.test","password":"YOUR_PRIVATE_DEMO_PASSWORD"}' \
  http://localhost:5000/api/v1/auth/login
# Login rotates the CSRF cookie: use the NEW aha_csrf value on subsequent mutations.
curl -b cookies.txt http://localhost:5000/api/v1/teacher/classes
```

The browser client automatically supplies the same-origin cookies and current CSRF header. Never store session tokens in localStorage. `GET /auth/me` returns user/role and demo-mode capability. `POST /auth/logout` revokes the server session and the browser application erases device data.

| Endpoint | Role / behavior |
| --- | --- |
| `GET /health` | Public, database reachability only |
| `GET /demo/tour` | Public, read-only synthetic aggregate atlas and narrative |
| `GET /auth/csrf`, `POST /auth/login` | Signed pre-login CSRF; rate-limited login |
| `GET /auth/me`, `POST /auth/logout` | Authenticated session |
| `GET/POST /teacher/classes` | Teacher-owned classes; creation returns one-time join code |
| `GET/PATCH /teacher/classes/:id` | Class metadata and private roster; patch requires title/grade/subject |
| `POST /teacher/classes/:id/join-code` | Replaces code, invalidates old one, audited |
| `POST /teacher/students` | Teacher provisions a student into own class, 12+ character password |
| `POST /join/:code` | Student joins a class within their organization |
| `GET/POST /concepts` | Scoped concepts; student read-only; teacher writes |
| `GET /concepts/:id/graph` | Concept and prerequisite IDs |
| `GET/POST /concepts/:id/misconceptions` | Teacher-reviewed descriptions and hints |
| `GET/POST /questions`, `GET /questions/:id` | Teacher bank including answer keys; create approved immutable version |
| `PATCH /questions/:id` | Explicit 409; author a new version instead of mutating historic evidence |
| `GET/POST /diagnostics` | Teacher draft creation; student sees published enrolled sets |
| `GET /diagnostics/:id` | Keys only for the owning teacher; students get stems/options only |
| `POST /diagnostics/:id/publish` | Owning teacher publishes a set of approved diagnostic questions |
| `POST /student/diagnostics/:assignmentId/start` | Idempotent start/resume, returns attempt and answered IDs |
| `POST /student/diagnostics/:attemptId/answer` | Immutable answer; validates question/option pair and explicit boolean confidence |
| `POST /student/diagnostics/:attemptId/finish` | Requires all answers; returns no early answer key |
| `GET /student/diagnostics/:attemptId/result` | Available only after submission; own feedback and possible tags |
| `GET /teacher/classes/:id/atlas` | Completed diagnostics; optional 0–1 accuracy/confidence query thresholds |
| `GET /teacher/classes/:id/priority` | Ranked sufficient-evidence nodes + separate collection actions |
| `GET /teacher/classes/:id/insights` | Stage-specific counts, denominators and timestamp |
| `GET/POST /bridges`, `POST /bridges/:id/approve` | Teacher authors/adapts new version and approves explicitly |
| `POST /teacher/bridge-assignments` | Requires approved activity and owned enrolled learner |
| `GET /student/bridge-assignments` | Own missions and review feedback |
| `POST /student/bridge-assignments/:id/complete` | Idempotently schedules distinct Echo question 72h later |
| `POST /student/teachbacks` | Completed own mission, 15–6000 chars, optional bounded strokes |
| `GET /teacher/teachbacks`, `POST /teacher/teachbacks/:id/review` | Own class only; four 0–3 rubric dimensions and supportive feedback |
| `GET /student/echo-checks` | Own due/upcoming/completed checks; upcoming stems withheld |
| `POST /student/echo-checks/:id/answer` | Enforces due time, ownership and exact option/question match |
| `POST /demo/echo-checks/:id/make-due` | Own synthetic learner only and DEMO_MODE; audited; 404 otherwise |
| `GET /teacher/classes/:id/print-pack` | Print-ready activities and key-free diagnostic response sheets |
| `POST /teacher/classes/:id/print-entries` | Validated full sheet; creates inactive pseudonymous paper learner, audited |
| `POST /sync/batch` | At most 30 items; only approved student operation types; per-item outcomes |
| `GET /admin/health-summary`, `GET /admin/audit` | Aggregate health and latest 100 elevated events; no learner explanation access |

## Payload examples

Diagnostic answer:

```json
{"question_id":"QUESTION_UUID","answer_option_id":"OPTION_UUID","sure":true}
```

Assignment:

```json
{"classroom_id":"CLASS_UUID","student_id":"LEARNER_UUID","bridge_activity_id":"ACTIVITY_UUID","trigger_attempt_id":"ATTEMPT_UUID","override_reason":"Paper works best for this learner today."}
```

Teach-back:

```json
{"bridge_assignment_id":"MISSION_UUID","text_body":"The denominator names equal-sized pieces. Here is a new example...","drawing":[[{"x":10,"y":20},{"x":40,"y":20}]]}
```

No arbitrary SVG strings, files, HTML, audio or video are accepted. Drawing bounds: 100 strokes, 2500 total points, x=0–600, y=0–240. Request limit: 128 KiB.

Offline replay:

```json
{"items":[{"client_mutation_id":"device-generated-unique-key","kind":"diagnostic_answer","resource_id":"ATTEMPT_UUID","payload":{"question_id":"QUESTION_UUID","answer_option_id":"OPTION_UUID","sure":false}}]}
```

Kinds: `diagnostic_answer`, `diagnostic_finish`, `bridge_complete`, `teachback`. Reusing a key with different content yields `idempotency_conflict`. Unknown kinds, stale submissions and foreign resources are rejected individually. A failed item stays in IndexedDB with an explanation; teacher actions never replay offline.
