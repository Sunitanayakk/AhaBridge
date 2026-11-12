# Architecture

```mermaid
flowchart LR
  B[Browser: React / TypeScript] -->|Same-origin JSON + CSRF| F[Flask versioned API]
  B --> I[Bounded IndexedDB drafts and replay queue]
  B --> S[Service worker: public app shell only]
  F --> A[Opaque hashed sessions and classroom authorization]
  F --> E[Deterministic evidence and bridge services]
  A --> P[(PostgreSQL)]
  E --> P
  D[Multi-stage Docker build] --> F
  F --> V[Vite static build and SPA routes]
```

One production web service serves both API and static files. No production CORS is required. Gunicorn uses one worker with four threads, matching the single-instance demo and in-process login limiter. Startup migrations use a PostgreSQL advisory lock. Larger deployments should move migration execution into a controlled release step and provide a shared limiter backend; they are outside this deployment's sizing assumptions.

## Relational model

```mermaid
erDiagram
  ORGANIZATIONS ||--o{ USERS : contains
  ORGANIZATIONS ||--o{ CLASSROOMS : owns
  USERS ||--o{ AUTH_SESSIONS : authenticates
  USERS ||--o{ CLASSROOMS : teaches
  CLASSROOMS ||--o{ CLASS_ENROLLMENTS : enrolls
  USERS ||--o{ CLASS_ENROLLMENTS : joins
  CONCEPTS ||--o{ CONCEPT_PREREQUISITES : depends_on
  CONCEPTS ||--o{ MISCONCEPTIONS : describes
  CONCEPTS ||--o{ QUESTIONS : tests
  QUESTIONS ||--|{ ANSWER_OPTIONS : offers
  MISCONCEPTIONS o|--o{ ANSWER_OPTIONS : tags
  CLASSROOMS ||--o{ DIAGNOSTIC_SETS : publishes
  DIAGNOSTIC_SETS ||--|{ DIAGNOSTIC_SET_ITEMS : includes
  QUESTIONS ||--o{ DIAGNOSTIC_SET_ITEMS : selects
  DIAGNOSTIC_SETS ||--o{ DIAGNOSTIC_ATTEMPTS : collects
  USERS ||--o{ DIAGNOSTIC_ATTEMPTS : answers
  DIAGNOSTIC_ATTEMPTS ||--o{ DIAGNOSTIC_RESPONSES : records
  CONCEPTS ||--o{ BRIDGE_ACTIVITIES : supports
  BRIDGE_ACTIVITIES ||--o{ BRIDGE_ASSIGNMENTS : assigns
  USERS ||--o{ BRIDGE_ASSIGNMENTS : receives
  BRIDGE_ASSIGNMENTS ||--o| TEACHBACKS : explains
  BRIDGE_ASSIGNMENTS ||--o| ECHO_CHECKS : reassesses
  USERS ||--o{ SYNC_RECEIPTS : deduplicates
  CLASSROOMS ||--o{ PRINT_ENTRIES : audits
  USERS ||--o{ AUDIT_LOGS : acts
```

For this slice a diagnostic set is its classroom assignment; one set has one classroom, and each learner has at most one immutable attempt per set. Reassessment uses a newly authored set. There is no separate scheduling table for repeated diagnostic assignments. Content versions are immutable question records. Teachers can adapt a bridge into a newly approved record without changing an already assigned activity.

## Security boundaries

Sessions use 48-byte random opaque cookies, SHA-256 server-side token hashes, an eight-hour expiry and explicit revocation. Passwords use Argon2id. Production cookies require HTTPS and are HttpOnly/SameSite=Lax; CSRF tokens are separate cookies bound to server session hashes. Unauthenticated login CSRF tokens are signed and expire. All mutations require a matching header. Unknown credentials receive a common message; login is limited to ten attempts per minute per IP.

Teacher access requires classroom ownership and organization equality. Student assignments require ownership and enrollment. Teachers can author only their organization's content; students never receive active answer keys. Admin routes expose aggregate health and bounded audit history. SVG markup is never accepted; bounded numeric drawing strokes render as React polylines. Text is escaped by React. JSON bodies are limited to 128 KiB. Production rejects SQLite or weak secrets. Private API responses carry `Cache-Control: no-store`.

Offline replay permits only student answer, finish, completion and teach-back operations. Every item passes the normal ownership and state checks. Receipt uniqueness is `(user_id, client_mutation_id)`, fingerprints reject key reuse with different payloads, and valid items commit independently. Conflicts stay visible on the device for review. Teacher reviews and grades cannot be replayed offline.
