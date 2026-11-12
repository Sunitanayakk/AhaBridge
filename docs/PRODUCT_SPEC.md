# COPY/PASTE START HERE — SINGLE MASTER INSTRUCTION FOR YOUR CODING AGENT

**Implement this specification as a real application.** This document contains the complete product build prompt (PROMPT 1), the full design prompt (PROMPT 2), security audit (PROMPT 3), Render deployment hardening (PROMPT 4), and hackathon pitch (PROMPT 5). In an agent with filesystem access, attach the companion PNG and then feed the whole file as one specification; treat PROMPT 1 and 2 as simultaneous binding requirements. Implement in the phase order listed, then run PROMPT 3 and PROMPT 4 before claiming readiness. PROMPT 5 comes only after verified functionality.

**Non-negotiable integration:** Use the exact bundled image `reference_assets/aha-bulb-original.png`, not a generated replacement. The companion image is part of the deliverable, not merely a URL or a textual description.

---

# AhaBridge — Complete AIET SDG 4 Hackathon Build Prompt Pack

**Challenge:** AIET IDEA Hackathon, November 2026 — Future-Ready Education (SDG 4)  
**Project:** AhaBridge — Intelligent Learning Recovery Studio  
**Tagline:** *From “I got it wrong” to “I can teach it right.”*  
**Target:** A working, polished, demonstrable full-stack web application, locally runnable with Docker Compose and deployable to Render.

**USER-SUPPLIED ARTWORK — MUST PRESERVE:** The companion reference image `reference_assets/aha-bulb-original.png` is the actual uploaded graphic: a yellow hand-drawn lightbulb surrounded by elaborate black-ink swirls, blue/orange/yellow accents and stars on ruled notebook paper with pink vertical margins. **Use this exact PNG as a genuine image asset**, not a vague inspiration to approximate, not an AI-generated substitute, and not an unrelated stock illustration. Copy it into `frontend/src/assets/illustrations/aha-bulb-original.png`. If your environment does not contain the companion file, ask for it or continue with a clearly labelled asset placeholder; never claim the specific graphic was integrated without possessing the file.

**Primary product brand:** “AhaBridge” in the user's warm hand-drawn sketchbook design, with the supplied bulb illustration featured prominently on the landing page, and thoughtfully reused in meaningful moments. The illustrative artwork should *complement*, not reduce, the application's educational functionality.

**Usage rights:** Treat the graphic as user-provided; before public deployment, the project owner should verify that they own or have a license to publish it. Do not remove any provenance or attribute authorship without verification.

## Innovation assessment and honest positioning

AhaBridge is **not** claiming invention of misconception diagnostics, adaptive teaching, offline content, or paper assessments. These features exist separately in products such as Eedi, Kolibri, DIKSHA, and Plickers. The proposed hackathon differentiation is **an integrated, teacher-verified, accessible classroom intervention loop** combining (a) diagnostic evidence, (b) explainable misconception clustering, (c) locally meaningful low-tech action cards, (d) student teach-back proof, and (e) an equivalent but distinct delayed transfer check. The public novelty claim should be limited to this particular implementation and workflow; a web comparison cannot prove global uniqueness.

Evidence reviewed (November 2026):
- UN SDG 4: https://sdgs.un.org/goals/goal4
- Eedi diagnostic engine: https://www.eedi.com/diagnostic-engine
- DIKSHA: https://diksha.gov.in/about/
- Kolibri: https://learningequality.org/kolibri/about-kolibri/
- Plickers: https://help.plickers.com/hc/en-us/articles/360009395854-What-is-Plickers
- Render blueprint docs: https://render.com/docs/blueprint-spec
- Render Free limits: https://render.com/docs/free

---

# PROMPT 1 — MASTER FULL-STACK BUILD AGENT (PASTE FIRST)

You are a senior full-stack engineer, learning scientist, privacy-first product designer, frontend animation specialist, QA engineer, DevOps engineer, and hackathon product lead.

Your task is to **IMPLEMENT, TEST, AND DOCUMENT** a complete product called **AhaBridge: Intelligent Learning Recovery Studio**, for Aryan Institute of Engineering and Technology's November 2026 SDG Innovation Series theme, **Future-Ready Education**, SDG 4. Do not respond with a general plan, wireframes alone, pseudocode, or unconnected components. Create and modify actual working project files in the repository. If running in a tool that cannot create files, provide complete files in dependency order with explicit paths. Work in ordered phases and verify each phase before continuing. Prefer a robust small vertical slice over dozens of disconnected screens.

## Product objective

AhaBridge supports resource-constrained and mixed-device classrooms. It helps a teacher answer:
1. *What concept did the learner struggle with?*
2. *What is the likely misunderstanding, with evidence rather than a made-up AI diagnosis?*
3. *What 10–15 minute real-world or printable activity should we try?*
4. *Can the student teach back the idea in their own words?*
5. *Can the student solve a new but equivalent problem 48–72 hours later?*
6. *At the classroom level, where should the teacher spend the next 15 minutes?*

AhaBridge is NOT another chatbot, marks predictor, LMS clone, or online quiz site. The core loop must function without an LLM or any paid API.

**Visible visual objective:** The main website must unmistakably resemble the supplied lightbulb artwork: white/cream ruled paper, thin sky-blue horizontal notebook lines, pink margin lines, intricately inked doodles, scribbled stars, warm yellow, orange and soft blue. Use the exact PNG as the hero artwork; do not describe this as accomplished if only unrelated SVGs have been drawn.

## Tech stack (hard requirements)

- Frontend: React + TypeScript + Vite; Tailwind CSS plus custom CSS variables and original hand-drawn CSS/SVG; React Router; TanStack Query; React Hook Form + Zod; accessible icons via lucide-react; animation via Motion/Framer Motion; charts via Recharts where useful; responsive mobile-first PWA using vite-plugin-pwa; IndexedDB using `idb` for selected offline content and queued responses.
- Backend: Python 3.12+, Flask application factory, versioned blueprints, SQLAlchemy 2, Flask-Migrate/Alembic, PostgreSQL with psycopg, Gunicorn, strong request validation and consistent JSON errors, pytest. Use well-maintained compatible pinned package versions.
- Authentication: secure, opaque session tokens stored as hashes server-side in PostgreSQL; HttpOnly/Secure/SameSite cookies; CSRF defense for mutating actions; Argon2id password hashing; role-based authorization for `student`, `teacher`, `admin`. No JWTs stored in localStorage. No public self-service creation of elevated accounts.
- Deployment: Docker Compose with frontend development server + Flask API + PostgreSQL for local work; single multi-stage production Docker image that builds the React app and serves its static output from Flask on the same origin; one Render Docker web service + one Render PostgreSQL database via `render.yaml`. Environment secrets, no hardcoded credentials.
- Browser and data: no browser-only feature can silently block core tasks; Web Speech API and SVG handwriting/sketching are progressive enhancements only.
- Do not require OpenAI, Anthropic, Hugging Face, Ollama, Redis, RabbitMQ, S3, Firebase, paid OCR, or external AI services for the MVP. Optional extension interfaces are okay if completely disabled by default and not represented as working.

## User roles and access

**Student:** Enter a class with a teacher-issued access code; complete short diagnostics; select confidence (Sure/Not sure); see feedback and strengths without shaming; complete assigned bridge missions; submit a text-based teach-back or simple SVG sketch; view due 72-hour “Echo Check”; view their own progress and earned Aha moments. Student accounts may use classroom pseudonyms; no need to collect precise location, DOB, caste, religion, family income, or other sensitive data.

**Teacher:** Create a class; invite students; author concepts, prerequisite relationships, questions and misconception-tagged distractors; publish diagnostic sets; inspect anonymized class-level rescue map and individual results only for their own students; select, edit, assign, and print recovery activity cards; review teach-back submissions; publish delayed check; compare learning evidence over time; export CSV/PDF-ready print views.

**Admin:** Manage approved organizations, teacher invitations, demo content and platform health; view only aggregate analytics by default; strict audit log for elevated actions. No unnecessary access to learners' explanations.

## Signature features — implement end-to-end

### A. Concept & Misconception Atlas
A teacher constructs a graph of concepts and prerequisites (e.g., fractions → equivalent fractions → fraction addition). Each answer choice to a diagnostic multiple-choice question may be annotated with an evidence-based misconception tag, rationale, and a teacher review status. Wrong answers imply a **possible** misconception, never a clinical/cognitive diagnosis. Return supporting question IDs and selected options in the API.

### B. The “Uncertainty Signal”
After each question, student chooses *I'm sure* or *I'm not sure*. Display correct/incorrect and confidence as separate facts. If a student chooses a tagged wrong answer confidently, treat as high-priority *possible conceptual misunderstanding*; if unsure and wrong, suggest building the foundation. Never label the child as incapable. Confidence must not override performance or serve as an automated grade.

### C. Classroom Rescue Map
Display a beautiful, responsive concept graph with irregular hand-drawn nodes and animated connector lines. Each node has a grounded status: “Enough evidence”, “Needs support”, or “Insufficient evidence”. Teachers can click any node for a side panel showing evidence counts, common wrong options, affected share, prerequisites, recommended 10–15 minute activities, and *why* the recommendation was made. No public student names in aggregated views; suppress tiny-group breakout details (<3 students). Provide a list/table accessible fallback for the visualization. Do not fabricate a score if no attempts exist.

### D. Explainable Bridge Planner
Suggest one of three modes: `hands_on`, `printable`, or `digital`, depending on teacher selection and learner access preference. Activities must be locally understandable: Odisha market change and discounts, everyday water measurement, local bus travel time, paper fractions, class canteen budgeting, reading practical notices, and school waste audits where pedagogically relevant. A teacher can edit each activity and approve it before assigning. For each activity store concept, estimated time, materials, language, steps, misconception addressed, observable success criteria, and an equivalent follow-up question. Seed enough original teacher-reviewed examples to produce meaningful demos without external AI.

### E. Teach-Back Studio
Students explain the concept with their own words and optionally draw in a simple SVG drawing canvas. For version 1, do NOT accept audio/video or unbounded file uploads, because Render's ephemeral disk is unsuitable for permanent uploads. If speech-to-text is added, it should be optional and browser-dependent, with no audio storage. Teacher reviews each submission and provides supportive feedback against a rubric: clarity, correctness, example, and evidence of transfer. Completion must not be automatically interpreted as mastery.

### F. “Echo Check” — delayed transfer
Store a check due at 72 hours after completed bridge activity (configurable 48–72 hours). When the learner later visits the application, show due checks. Use a NEW, equivalent question, not an identical repeat of the diagnostic. If a check isn't completed, show “Not yet assessed,” not “Failed.” Make scheduling work without a background worker by querying `due_at <= now()` when the relevant page loads. Calculate before/after summary with n and timestamp; never claim a statistically proven causal improvement from a tiny demo dataset.

### G. Print & Low-Connectivity Access
Teachers can print a low-ink classroom intervention pack using browser print CSS, with teacher-authored instructions, printable concept cards, and student response sheets. Include an optional QR linking to an approved resource, but do not assume QR works offline unless the linked lesson was explicitly cached. PWA: cache app shell, preselected approved lessons and queued diagnostic/teach-back text responses in IndexedDB; show a clear online/offline badge and pending sync count; sync with idempotency keys when internet returns; avoid uploading duplicate attempts. Teachers may manually enter anonymized responses from printed sheets. Don't assert full offline backend capability.

### H. Inclusive language and accessible UX
Offer English, Hindi, and Odia UI language options with a clear translation fallback marker. Provide genuinely authored translations for the MVP's primary labels and seed activities; never claim full multilingual support if content hasn't been translated. Add reduced-motion support, keyboard support, labels, screen-reader announcements for quiz feedback, color-independent states, good text contrast, 44–48px targets, adjustable text-size control, a dyslexia-friendly optional readable body mode, and print variants.

### I. Aha Moments and Impact
Celebrate validated improvement with subtle pencil doodle, hand-drawn starburst and confetti; do not reward random guessing. Dashboard metrics include: questions attempted, concepts sampled, concepts needing attention, bridge activities assigned/completed, teach-backs teacher-reviewed, Echo Checks due/completed, and verified recovery outcomes. Each chart should explain how the measure was calculated and show N. Keep the scoring transparent and non-punitive.

## Core educational algorithm — deterministic and auditable

For each concept, from its recent diagnostic responses compute:
- `accuracy = correct_responses / total_responses` when total >0.
- `confidence_mismatch = count(high_confidence_wrong) / count(confidence_responses)` when denominator >0.
- `tagged_misconception_count[tag] = number_of_selected_distractors_tagged_with_tag`.
- `evidence_status = insufficient_evidence` if fewer than two distinct diagnostic questions were attempted for the concept, otherwise `enough_evidence`.
- `needs_support = enough_evidence AND (accuracy < 0.65 OR confidence_mismatch >= 0.4)`; these cutoffs are editable, heuristic demo defaults, not validated psychometrics.
- `post_accuracy` and `delayed_accuracy` are separate metrics, based on independently tagged, non-identical questions. Do not average all stages together and call it mastery.
- Show a recovery candidate only after at least one diagnostic attempt, a bridge intervention, and a subsequent comparable correct response; show “retained” only when a delayed check is answered correctly. Use “Observed improvement in this sample” rather than “AI proved mastery.”

For prioritizing concepts for teacher intervention, define a simple, documented score:
`priority = 0.40 * gap_prevalence + 0.25 * prerequisite_importance + 0.20 * confidence_mismatch + 0.15 * recent_struggle`
where each term is normalized 0–1, recent_struggle is the proportion of wrong responses in the latest diagnostic, and prerequisite_importance is a 0–1 teacher-authored value indicating how many downstream lessons depend on the concept. If there is insufficient evidence, show a diagnostic collection action instead of ranking the concept as deficient. Provide a “Why recommended?” explanation that displays the input values and weights. Make teacher overrides explicit and logged.

## Exact supplied hero illustration — mandatory integration contract

1. Ship `frontend/src/assets/illustrations/aha-bulb-original.png` as the **identical original supplied artwork**. Verify it loads via a production Vite build, not merely the local dev filesystem. Add a robust `HeroDoodleIllustration` React component; import its URL from the module bundler and use a descriptive accessible `alt` (or empty `alt` only when demonstrably decorative). Never hardcode Windows paths or reference `/mnt/data` in deployed source.
2. Hero layout: desktop two-column notebook composition. **Left:** tiny pinned “AIET IDEA Hackathon · November 2026 · SDG 4” tag, hand-lettered “Every mistake is a map to understanding.”, one-sentence mission, real “Explore Demo Classroom” and “Teacher Login” CTAs; **right:** original doodle artwork in a purposeful paper collage frame, filling a major portion of the viewport, with no cropping of the lightbulb or decorative edges. Keep the notebook-paper background of the original image visible; because the supplied PNG is opaque, do **not** promise transparent floating swirls. Visually blend with the warm-white site using a soft notebook-sheet inset, not artificial background removal.
3. Art directions: original image is a single flattened PNG. **Whole-image motion** (entrance/floating/tilt) is possible. Independent motion of its already-baked-in stars and swirls is **not** possible without separately recreating those elements. For subtle motion, animate the picture as a unit and optionally place small **new** pencil-drawn SVG stars/sparkles around its frame. Do not suggest that altering DOM CSS automatically animates existing pixels separately. Preserve illustration's line work, proportions and colors.
4. Additional uses: a smaller, intentionally framed view in the 5-step loop intro; a tiny thumbnail on Aha Insight/verified recovery cards; a printable-safe static variation on lesson certificate/summary; a reduced-size hand-drawn bulb on the empty Classroom Atlas and friendly 404 state, without repeating the whole large hero image everywhere. The educational graphs and tasks must remain primary.
5. Define an image asset pipeline: appropriate responsive `sizes`, `decoding="async"` for noncritical placements, `fetchPriority="high"`/eager loading for LCP hero if justified, responsive CSS `object-fit: contain`, max-width constraints, height/aspect reservation to prevent CLS, and optional optimized `webp/avif` derivatives while retaining the source unchanged. Provide graceful fallback if image fails. Ensure bundle size/load time is reasonable.
6. Animation: Motion/Framer Motion reveal 500–800ms on initial entry, slight `translateY` (4–10px) and rotation (≤2°), gentle 4–6s hover or spring only if tasteful; optional SVG line-drawing along a **separate decorative pencil stroke**; stars appear around the picture, not pretending to be independent parts of the PNG. Honor `prefers-reduced-motion`; if reduced, render still image with no entrance offset or looping. Avoid aggressive flashes.
7. Consistency: synchronize notebook background line-spacing and pink margins around the hero and in selected sections; preserve contrast and accessibility. Do not cover headings or forms with the illustration. No generic gradient blobs, glossy glass, glowing AI robot, neon purple, unrelated stock photos or inconsistent styles.
8. Explicit acceptance: verify the actual image is visible at widths 360, 390, 768, 1024 and 1440px; no crop, overdraw, stretching, broken asset path, overlapping text or accidental double-stars. Screenshot the real rendered hero and compare against the supplied reference file; log any deviations and fix them. Verify that this graphic is served correctly through the production Flask static setup on Render.

## Required application routes/screens

**Public:** `/` (animated sketchbook landing page featuring the exact original lightbulb illustration), `/how-it-works` (playable five-stage loop), `/sdg4` (accurate impact explanation), `/demo` (safe interactive read-only simulated class), `/login`, `/join/:code`, `/privacy`.

**Teacher:** `/teacher` (overview), `/teacher/classes`, `/teacher/classes/:classId`, `/teacher/classes/:classId/atlas`, `/teacher/diagnostics`, `/teacher/diagnostics/new`, `/teacher/questions`, `/teacher/bridges`, `/teacher/bridges/new`, `/teacher/reviews`, `/teacher/insights`, `/teacher/print/:classId`, `/teacher/settings`.

**Student:** `/student`, `/student/diagnostics/:assignmentId`, `/student/result/:attemptId`, `/student/missions`, `/student/missions/:assignmentId`, `/student/teachback/:assignmentId`, `/student/echo-checks`, `/student/journey`, `/student/settings`.

**Admin:** `/admin`, `/admin/teachers`, `/admin/content`, `/admin/audit`.

**General:** `/404`, error boundary and safe loading skeletons. Ensure every navigation link goes to a working screen and every visible button has meaningful behavior. For complex features, ship useful MVP behavior rather than a dead placeholder.

## Visual experience — follow PROMPT 2 without dilution

Implement the user's existing Hand-Drawn style **using the exact supplied bulb image as its signature hero asset**: `#fdfbf7` paper, `#2d2d2d` pencil, `#e5e0d8` muted old paper, `#ff4d4d` correction red, `#2d5da1` ballpoint blue, sticky-note `#fff9c4`; headings **Kalam 700** and body **Patrick Hand 400**; irregular/wobbly radii, 2–4px pencil borders, 4px or 8px HARD OFFSET NO-BLUR shadows, paper dot textures, hand-drawn SVG doodles, tape, thumbtacks and intentionally rotated cards. Never turn this into a generic purple SaaS dashboard. See the stand-alone design prompt below for motion/accessibility specifications.

## Data model (use UUID PKs, FK constraints, meaningful indexes)

Implement normalized relational models with SQLAlchemy and Alembic migrations:
- `organizations`: id, name, created_at.
- `users`: id, organization_id, role, pseudonym/display_name, email nullable, password_hash, language, active, created_at. Unique email only when non-null.
- `auth_sessions`: id, user_id, token_hash unique, csrf_hash, expires_at, revoked_at, created_at.
- `classrooms`: id, organization_id, teacher_id, title, grade_band, subject, join_code_hash/unique random join code handling, created_at, archived_at.
- `class_enrollments`: id, classroom_id, student_id, joined_at; unique classroom_id + student_id.
- `concepts`: id, organization_id nullable for global content, subject, grade_band, slug, name, description, status, importance, created_by.
- `concept_prerequisites`: id, concept_id, prerequisite_concept_id, unique pair; prohibit cycles in service layer.
- `misconceptions`: id, concept_id, code, plain_language_description, suggested_bridge_hint, teacher_reviewed.
- `questions`: id, concept_id, stem, language, version, difficulty, source_type, approved, created_by, created_at.
- `answer_options`: id, question_id, label, text, is_correct, misconception_id nullable; exactly one correct option per single-select question, enforce in service validation.
- `diagnostic_sets`: id, classroom_id, title, status, created_by, published_at.
- `diagnostic_set_items`: id, set_id, question_id, position.
- `diagnostic_assignments`: id, set_id, classroom_id, due_at, published_at.
- `diagnostic_attempts`: id, assignment_id, student_id, started_at, completed_at, client_mutation_id unique per student.
- `diagnostic_responses`: id, attempt_id, question_id, answer_option_id, sure, answered_at; unique attempt_id + question_id.
- `bridge_activities`: id, concept_id, misconception_id nullable, title, language, mode, minutes, materials_json, instructions_json, success_criteria_json, approved_by, version, created_at.
- `bridge_assignments`: id, teacher_id, student_id, classroom_id, bridge_activity_id, trigger_attempt_id nullable, status, assigned_at, completed_at, echo_due_at.
- `teachbacks`: id, bridge_assignment_id unique, text_body, drawing_svg_json nullable, review_state, reviewed_by nullable, rubric_json nullable, feedback nullable, submitted_at, reviewed_at. Sanitize all SVG-derived data; store bounded structured drawing strokes if possible, not arbitrary SVG markup.
- `echo_checks`: id, bridge_assignment_id, question_id, due_at, status, answered_at, selected_option_id nullable, correct nullable; validate equivalence of question concept and ensure it differs from original diagnostic question.
- `print_entries`: id, classroom_id, teacher_id, diagnostic_response_data_json, source_label, created_at; audit manual entries.
- `sync_receipts`: id, user_id, client_mutation_id, payload_hash, response_json, created_at; unique user_id + client_mutation_id.
- `audit_logs`: id, actor_id, action, target_type, target_id, metadata_json, created_at.

Use `JSONB` only for bounded flexible instructional steps/rubrics, not as a substitute for relational tables. Provide migrations, constraints, database seed scripts and rollback procedure. Do not store children's exact locations, biometrics or sensitive demographics.

## API contract — implement documented request and response models

Prefix: `/api/v1`. JSON, pagination and filters where applicable, consistent errors `{error:{code,message,details},request_id}`; appropriate 401/403/404/409/422 status codes.

- `GET /api/v1/health` public minimal health status (the health-check endpoint is absolute, whereas all following route names below are relative to the `/api/v1` prefix).
- `GET /auth/csrf`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- `POST /join/:code` authenticated student only, teacher-controlled enrollment.
- `GET/POST /teacher/classes`, `GET/PATCH /teacher/classes/:id`.
- `GET/POST /concepts`, `GET /concepts/:id/graph`, `GET/POST /concepts/:id/misconceptions` (write teacher/admin only).
- `GET/POST /questions`, `GET/PATCH /questions/:id` (authoring and approvals).
- `GET/POST /diagnostics`, `POST /diagnostics/:id/publish`, `GET /diagnostics/:id`.
- `POST /student/diagnostics/:assignmentId/start`, `POST /student/diagnostics/:attemptId/answer`, `POST /student/diagnostics/:attemptId/finish`, `GET /student/diagnostics/:attemptId/result`.
- `GET /teacher/classes/:id/atlas`, `GET /teacher/classes/:id/priority`, `GET /teacher/classes/:id/insights`.
- `GET/POST /bridges`, `POST /bridges/:id/approve`, `POST /teacher/bridge-assignments`, `GET /student/bridge-assignments`, `POST /student/bridge-assignments/:id/complete`.
- `POST /student/teachbacks`, `GET /teacher/teachbacks`, `POST /teacher/teachbacks/:id/review`.
- `GET /student/echo-checks`, `POST /student/echo-checks/:id/answer`.
- `GET /teacher/classes/:id/print-pack` (return JSON/HTML-ready data; print in browser), `POST /teacher/classes/:id/print-entries`.
- `POST /sync/batch` authenticated, size-limited, idempotent, ownership-checked, returns individual item outcomes; no offline replay of stale grade-changing operations without conflict handling.
- `GET /admin/health-summary`, `GET /admin/audit` admin-only.

Never reveal correct answers when an assessment is still active unless the student already submitted and policy permits release. Authoring API returns answer keys only to authorized teacher/admin. Every student and teacher resource must be authorization-scoped.

## Content and seeded interactive demo

Seed two demo classes (e.g., Grade 7 Math and Grade 8 Applied Numeracy), 12–18 pseudonymous learners, 4 concepts (fractions, ratios, unit conversion, reading data charts), 2–4 versioned diagnostic questions per concept, at least 3 tagged misconceptions, 6 hands-on/print/digital bridge activities with actual actionable instructions, 4 teacher-reviewed teach-backs, and several Echo Check outcomes that include success, still struggling, insufficient evidence, and not-yet-due states. Sample data MUST be clearly marked synthetic. Provide a read-only public tour that displays one example student journey and lets judges explore the cause-and-effect loop without login.

Demo flow should be live, not a slideshow: teacher creates diagnostic → demo student answers a high-confidence wrong option → misconception appears with cited answer evidence → teacher approves & assigns paper-fraction mission → student submits teach-back → teacher reviews → simulated due Echo Check is answered with a distinct question → teacher views updated concept status and measured outcome. For an accelerated hackathon demo, allow a **demo-only time-travel fixture/control** accessible only in seeded demo mode, NEVER a production user-configurable clock.

## Security, ethical design and trust

- AhaBridge is a teaching aid, not a diagnostic device or a replacement for educators. Use “likely misconception” and show evidence.
- Teacher approval is mandatory for recommended interventions and any optional generated content.
- Keep names private, small group results suppressed, student accounts pseudonymous where possible. Never construct student popularity or deficit leaderboards.
- Strong input validation and maximum payload sizes; sanitize displayed text; no arbitrary HTML/SVG injections; parameterized queries via ORM; protection against CSRF, brute-force logins and privilege escalation; secret management.
- Students see only their own assignments and results; teachers see only their classrooms; admin access is constrained and audited.
- Require school authorization/guardian consent as appropriate before using real children; default public demo uses synthetic data only. Provide retention and deletion workflows and a plain-language privacy page.
- Do not claim “AI-powered” if the implemented engine is rule-based. Call it **explainable learning intelligence** and document its heuristics. AI-assisted activity drafting can be optional later, gated by approval and a real configured service.

## Local development, Docker and Render deliverables

Repository structure:
```
/
  README.md
  docs/ARCHITECTURE.md
  docs/EDUCATIONAL_METHOD.md
  docs/DEMO_SCRIPT.md
  docs/ORIGINALITY_AND_LIMITATIONS.md
  docs/API.md
  docs/DEPLOY_RENDER.md
  frontend/
    src/{app,components,features,pages,styles,lib,assets,tests}/
    public/
    src/assets/illustrations/aha-bulb-original.png  # copy of exact supplied PNG
    package.json
    vite.config.ts
    tsconfig.json
  backend/
    app/{__init__.py,config.py,extensions.py,models/,api/,services/,security/,seeds/}
    migrations/
    tests/
    requirements.txt
    wsgi.py
  scripts/start.sh
  Dockerfile
  compose.yaml
  render.yaml
  .dockerignore
  .env.example
  .gitignore
  .github/workflows/ci.yml
```

Local: `docker compose up --build`; frontend on port 5173, Flask API on 5000, PostgreSQL on 5432 (dev only). Use Vite proxy `/api` to Flask. Separate Docker services for local development; prod one image builds Vite then copies `dist` into Flask static directory. Flask must serve the React SPA for non-API paths, but return real JSON 404s for unknown `/api/*`. The API and frontend should share an origin on Render, avoiding production CORS complexity.

Production: `render.yaml` creates a Docker web service and managed PostgreSQL with `DATABASE_URL` reference via `fromDatabase: {name: ahabridge-db, property: connectionString}`. Database and service must share a region, ideally Singapore for India. Inject `SECRET_KEY` with `generateValue: true`, read database URI from environment, and bind Gunicorn to `0.0.0.0:${PORT:-10000}`. Include a health check path. Migrations run **at startup for this single-instance demo** with a lock or careful idempotent strategy; do not rely on paid-only pre-deploy commands for the free MVP. Explain how paid deployments should migrate in a separate release step. Never run `db.create_all()` as the production migration strategy. No writes should depend on container local disk.

Demo deployment plan must mention: Render Free services spin down after ~15 min inactivity, free Render Postgres expires after 30 days, free disks are ephemeral, and therefore the free tier is a **hackathon preview**, not a durable production database. Provide a backup/export and migration-to-paid plan. Check current Render docs and don't invent free-tier guarantees.

## Performance, quality and acceptance tests

- Accessible, responsive at 360px, 768px, 1440px; prevent horizontal overflow.
- Functional loading, empty, error, success, online/offline and permission-denied states.
- PWA service worker does NOT cache auth/session API or private student responses in Cache Storage; offline IndexedDB is bounded to the authenticated device, with local wipe on logout and a privacy warning for shared devices.
- Production runs with correct secret and database URLs, no localhost hardcoding and no committed `.env`.
- Backend tests: permission boundaries, CSRF, session expiry, diagnostic scoring, misconception evidence, echo-check distinct question, idempotency, tenant isolation, migrations.
- Frontend tests: login, quiz, atlas empty/filled states, teach-back submission, offline badge, keyboard navigation and reduced motion.
- End-to-end smoke test: teacher→student→teacher→Echo Check; test with synthetic data.
- CI runs Python tests + frontend TypeScript typecheck/lint/tests + production build. Provide GitHub Actions workflow.
- Every visible important action must work. No fake graphs, fake AI calls, dummy endpoints, unimplemented tabs or buttons that look functional.
- Write polished docs, architecture diagram (Mermaid), ER diagram (Mermaid), API sample requests, demo credentials provisioning instructions, seed procedure, rollback notes, troubleshooting, and a 3-minute judge demo script.

## Build order — act instead of just narrating

Phase 0: Inspect repository and state what exists. Record assumptions; do not ask unnecessary questions.
Phase 1: Scaffold frontend, Flask factory, Postgres, secure auth, migrations, Docker Compose, health endpoint; run.
Phase 2: Seed concept/question/misconception data and complete diagnostic attempt saving; run backend tests.
Phase 3: Implement heuristic analytics, atlas and explainable priority; verify from actual data.
Phase 4: Build bridge planner, assignment, teach-back teacher review, due Echo Check; verify full learning loop.
Phase 5: Import and integrate the exact provided PNG into the hero (with actual file, accessible React component and responsive behavior); apply complete Hand-Drawn animated UI to EVERY screen, responsive + accessibility, then PWA/print features.
Phase 6: Add public read-only interactive demo and seeded examples.
Phase 7: Add production Dockerfile, Render Blueprint, CI and docs. Run Docker build, migrations and tests; fix issues.
Phase 8: Produce final acceptance checklist, real screenshots if tooling permits, route matrix, security notes, deployment instructions and explicitly call out anything not finished.

**Execution rule:** Don't stop after a design mockup. Whenever possible create working files and run commands/tests. Implement actual persisted data paths before cosmetic detail. No pseudocode, TODO placeholders, UI-only simulation disguised as working features, or invented results. If constrained, complete a smaller end-to-end subset and clearly disclose limitations.

---

# PROMPT 2 — COMPLETE ANIMATED DESIGN SYSTEM (PASTE AFTER PROMPT 1)

Act as a world-class creative frontend developer and interactive product designer. Apply the following **Hand-Drawn Sketchbook** style consistently to the working AhaBridge product. This is a binding visual brief, not optional inspiration.

## Visual concept

The application feels like a teacher's colorful working notebook, full of hand-drawn sketches, scribbled diagrams, sticky-note action cards, taped paper corners, rough arrows, schoolbook markings and optimistic “aha” moments. The **original uploaded illustrated lightbulb on blue-ruled white paper, with pink notebook margins and yellow/blue/orange swirling ink doodles, is the central identity illustration**. It must look distinct from generic SaaS: **no glossy gradients, glassmorphism, purple AI glow, stock-hero photos or perfect geometric borders.** Be playful without undermining readability or learner dignity.

## Locked color and typography tokens

- Background: warm paper `#fdfbf7`.
- Foreground pencil: `#2d2d2d`, not pure black.
- Muted erased pencil/paper: `#e5e0d8`.
- Correction marker red: `#ff4d4d`.
- Ballpoint blue: `#2d5da1`.
- Sticky yellow: `#fff9c4`.
- White cards: `#ffffff`.
- Heading font: Google Font `Kalam`, weight 700.
- Body font: Google Font `Patrick Hand`, weight 400. Use carefully selected readable system fallbacks if fonts cannot load.
- Captions may vary in size; main headings must look like hand-lettered notes. Body remains readable, 17–20px on appropriate viewports.

## Required CSS authenticity

- Never rely only on ordinary `rounded-lg`. Provide reusable `--radius-wobbly` and `--radius-wobbly-md`, such as `255px 15px 225px 15px / 15px 225px 15px 255px` where appropriate.
- Pencil outline `2px` minimum, `3–4px` for emphasized elements.
- Use **hard offset** shadows without blur, e.g. `4px 4px 0 0 #2d2d2d` and `8px 8px 0 0 #2d2d2d`. Button hover contracts offset; active press flattens shadow.
- Background texture: `radial-gradient(#e5e0d8 1px,transparent 1px)` on a `24px` grid, optionally subtle notebook lines; maintain contrast.
- Organic card rotations of `-2deg` to `2deg` applied to decoration/cards only; never rotate long passages, form fields or accessibility-critical content.
- Illustrations **besides the user-supplied hero PNG** are original inline SVG sketches and CSS shapes: pencil, schoolbook, arrows, tape, tack, confused cloud transforming into idea bulb, imperfect growth chart. No external images needed for core UI.
- Accent buttons are thick outlined wobbly paper ovals; fill with red on hover while maintaining readable contrast. Blue for links/focus states.
- Distinguish functional controls from non-clickable sticky-note decoration.

## Narrative interactive experience

1. **Landing hero — “Every mistake is a map.”** Left hand-drawn headline, short concise subhead, primary CTA “Explore Demo Classroom”, secondary “I'm a Teacher”; right **the exact uploaded yellow-lightbulb notebook PNG** with ornate swirls and star motifs, framed as a sketchbook collage. The original image must remain visually recognizable. A small **separate** paper annotation can show an incorrect fraction answer connecting via hand-drawn SVG arrow to a corrected model, but do not obscure/replace the supplied picture. Use restrained whole-image Motion reveal and separate SVG stroke animations; no WebGL required.
2. **Five-step learning loop:** Five rough paper nodes physically connected by animated scribble line. On scroll, their colors/labels progressively reveal. Include keyboard tab navigation and still images for reduced-motion preference.
3. **Classroom Atlas:** Animated connected graph of concepts on sketch cards; clicking opens a side drawer with a reasoned breakdown, supporting evidence, and rescue action. Use small in-graph legend; never depend on red/green alone.
4. **Rescue sticky notes:** Draggable/reorderable teacher suggestions if practical, otherwise accessible up/down controls; snap back gently using spring animation; printer-friendly layout.
5. **Student diagnostic:** A friendly exercise sheet with a moving pencil progress underline, sure/not sure toggle, empathetic feedback. Avoid confetti on correct guessing.
6. **Bridge Mission:** A “fold-open notebook” 3-stage activity card: materials, action, explain-it-back. Each fold is a tasteful short animation.
7. **Teach-Back Studio:** Paper writing surface, simple pencil/eraser sketch canvas, autosaved draft to IndexedDB (local-only while editing), and accessibility fallback text. Never send empty accidental submissions.
8. **Aha celebration:** A lightweight, reduced-motion-safe starburst for teacher-verified learning milestones; 1–2 seconds maximum and never blocks interaction. An original small bulb doodle derived from the visual language (or reduced unaltered image) can reinforce the brand, but never reward random correctness.
9. **Impact dashboard:** Hand-drawn chart axis and card-like score summaries, with accurate data, helpful empty states and screen reader accessible tables.
10. **Microinteractions:** Buttons physically press into their offset shadows; hovered cards rotate 1 degree; hand-animated dashed arrows; paper-tear tab indicators; supportive toast sticky notes; illustrated skeleton loaders.

## User-supplied bulb image: explicit creative and engineering directions

- **Exact source:** `reference_assets/aha-bulb-original.png` (provided alongside this prompt in the bundle). Put a copy at `frontend/src/assets/illustrations/aha-bulb-original.png`; do not redraw or replace it. Do not remove the notebook lines or crop its elaborate flourishes.
- **Layout and paper blending:** The PNG contains its own white ruled-paper background; it is not transparent. Set the landing page cream `#fdfbf7`, with the hero image placed as a self-contained white paper spread/panel or taped notebook sheet. Align nearby CSS ruled-paper accents with it where feasible, without pretending their horizontal rules connect pixel-perfectly. Preserve pink margin lines as a signature motif.
- **Responsive:** On desktop, art covers ~45–55% of the two-column hero. On mobile, stack hero text then image; don't let width exceed available space. Keep all source content (`object-fit:contain`), avoid forced `aspect-ratio` crops, and reserve natural size.
- **Animation realism:** A flattened image cannot separately articulate its embedded bulb, ink curls or stars. Animate whole-image opacity/position/rotation gently and draw new independent SVG sparkles/lines around it for accent if wanted. Use Motion, with reduced-motion fallbacks. No permanent brightness flashes or fake sound effects.
- **Component contract:** `HeroDoodleIllustration.tsx` accepts props `{ variant?: 'hero' | 'card' | 'empty'; className?: string; priority?: boolean }`, uses the imported PNG, outputs an accessible `<img>` with meaningful alt for informative usage, and `aria-hidden`/empty alt when decorative. Provide fallback sizing even when animation library is unavailable. Keep implementation simple and dependable.
- **Meaningful placements:** landing hero (required); 5-step learning loop header, Atlas no-data state, Aha Moment card, judge demo tour (optional and restrained). Never wallpaper the entire dashboard with repeated copies.
- **Artwork permission:** Prior to publicly deploying the original artwork, verify the user's rights to use and publish it.

## Accessibility and performance boundaries

Motion durations should generally be `150–450ms`; decorative loops can be slower. Respect `prefers-reduced-motion`. Do not block page rendering with large video, huge SVG filters or heavy animations. Contrast-check `#ff4d4d` when used with white text; if insufficient contrast, choose dark pencil text or darken the interactive red while preserving the palette's character. Use visible focus rings, semantic structure, 48px touch targets, skip navigation link, text alternative to each concept graph, meaningful ARIA for feedback, and no surprise auto-playing sound. Make mobile layouts delightful, not a compressed desktop artboard.

## High-quality acceptance checks

No default UI library appearance. All pages share consistent design tokens. The actual user-supplied image must be visible on the landing hero and should not be approximated by a regenerated asset. Test width at 360, 390, 768, 1024 and 1440px. Responsive cards collapse to one column without horizontal scroll. Include professional empty, error, print and offline states. The “Try Demo Classroom” CTA must open an actual working experience. Screenshot all main screens and inspect for alignment, text clipping, unreadable rotations or inaccessible controls.

---

# PROMPT 3 — FUNCTIONALITY AND SECURITY AUDIT (PASTE AFTER IMPLEMENTATION)

You are a skeptical senior QA lead. Audit the AhaBridge repository against PROMPT 1 and PROMPT 2. Do NOT simply praise the code. Inspect every route, button, backend endpoint, DB migration, user-role boundary, offline function, CSRF control, input validation, security header, React state/remote query, and seeded demo. Build a matrix with columns: Feature, expected behavior, actual implementation, failing test, severity, fix, retest result. Run the test suites and a full Docker Compose smoke test. Focus first on end-to-end student/teacher workflows, authorization/tenant isolation, idempotent offline replay, exact question/answer checking, and distinct delayed reassessments. Also inspect that the **exact supplied lightbulb PNG** exists in the frontend assets, loads in dev AND production builds, appears uncropped on mobile/desktop, has proper accessibility semantics, respects reduced motion, and is not merely replaced with a similar AI-generated picture. Fix every P0/P1 issue. Ensure the test feedback is factual; never say “passed” without execution. Surface remaining risks clearly.

---

# PROMPT 4 — RENDER DEPLOYMENT HARDENING (PASTE AFTER AUDIT)

Act as a senior platform engineer. Make the actual AhaBridge project deployable to Render with the lowest-complexity reliable architecture: one Docker-based Flask web service serving the production React static build at same origin, plus a managed PostgreSQL database. Use a multi-stage Dockerfile; a reproducible dependency install; Gunicorn binding `0.0.0.0:${PORT:-10000}`; `render.yaml` with `runtime: docker` and `DATABASE_URL` fromDatabase reference; secret environment variables; `/api/v1/health` health check; database migration strategy and safe seed strategy; graceful startup, logging and health checks. Do not use localhost in production, never store credentials in code, and don't rely on ephemeral local storage for uploads or the DB. Confirm actual current Render docs. Build and test the image locally, record all commands, supply exact GitHub-to-Render click steps. Ensure the production build bundles `aha-bulb-original.png`, the Flask static app serves the hashed asset correctly on initial page and nested SPA routes, and your final smoke test verifies a successful 200 response for the image asset. Clearly warn: Render free web service may spin down after 15min inactivity and free Postgres expires after 30 days. Offer safe export/upgrade path before data expiration. Do not claim you personally deployed to Render without access or evidence.

---

# PROMPT 5 — 3-MINUTE SDG HACKATHON DEMO AND PITCH (PASTE LAST)

You are a hackathon storyteller and SDG 4 evaluator. Write a 3-minute live demo script and concise 6-slide pitch for **AhaBridge**. Use only features verifiably implemented in the repository and label synthetic data as synthetic. Cover: classroom problem, existing solutions and honest differentiation (Eedi/DIKSHA/Kolibri/Plickers), the 5-stage rescue loop, a real teacher/student demo on seeded data, multilingual/print/low-bandwidth accessibility, observed demo evidence and caveats, alignment with SDG targets 4.1, 4.4, 4.5, and 4.a, realistic expansion plan, and one-line judge takeaway. Don't claim first-in-world or causal learning improvement without evidence. Begin the demonstration on the landing page with the original user-supplied yellow-bulb notebook art visible. Script the exact clicks from landing page to diagnostic, tagged wrong answer, teacher-reviewed bridge activity, teach-back, delayed new-question check and classroom rescue map.

---

## Extra evaluation rubric — visual fidelity AND engineering depth

A complete deliverable is judged on all five dimensions:
1. **Artwork fidelity (20%)** — actual original PNG prominently integrated; line-art, colored stars, notebook ruling and bulb are preserved; accessible mobile framing and gentle animation.
2. **Working learning loop (35%)** — diagnostic → evidence → bridge assignment → teach-back → Echo Check, with persistent Postgres data and role checks.
3. **Product polish (20%)** — responsive sketchbook styling, original supporting SVGs, thoughtful empty/loading/error states, accessible and reduced-motion-safe interaction.
4. **Deployment reliability (15%)** — Docker build, migrations, Render Blueprint, env settings, no persistent uploads to container filesystem, health check and smoke tests.
5. **Honesty and SDG alignment (10%)** — grounded SDG 4 story, clear heuristic limitations, no fake AI claims and synthetic demo data labelled.

## Recommended execution sequence for a coding agent

1. Open a clean repository, attach or copy `reference_assets/aha-bulb-original.png` into the working environment, and paste **PROMPT 1**. Instruct the agent to write actual files and run the first end-to-end slice.
2. Paste **PROMPT 2** when the core features work. Require consistency across all roles, not only a landing page.
3. Paste **PROMPT 3** and require fixing verified failures.
4. Paste **PROMPT 4** to harden deployment to Render.
5. Paste **PROMPT 5** only after features exist, so the pitch stays truthful.

## Technical starter examples (guidance, not substitutions for a full implementation)

`render.yaml` baseline:

```yaml
services:
  - type: web
    name: ahabridge-web
    runtime: docker
    plan: free
    region: singapore
    dockerfilePath: ./Dockerfile
    healthCheckPath: /api/v1/health
    envVars:
      - key: APP_ENV
        value: production
      - key: SECRET_KEY
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: ahabridge-db
          property: connectionString

databases:
  - name: ahabridge-db
    plan: free
    region: singapore
    databaseName: ahabridge
    user: ahabridge
```

**Check actual plan availability in your Render account.** Region and free tiers can change. The app must normalize the database scheme for psycopg/SQLAlchemy if needed; don't leak the URL in logs. A production worker count and startup migrations must match service resources. The optional demo seed is guarded by environment flags and must use provisioned credentials.

Local development commands after implementation:

```bash
cp .env.example .env
# On Windows PowerShell: Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
docker compose logs -f backend
# use documented migration and demo seed commands for this repository
```

For production deploy: push the working repository to GitHub, connect repo in Render, create from `render.yaml` Blueprint or create Docker web service + Postgres manually, configure secrets, verify migrations and `/api/v1/health`, then test the teacher/student workflow through the public URL.

---

## Judges' one-sentence articulation

> **“Most classroom apps tell teachers what students got wrong. AhaBridge helps teachers see why it might be wrong, assign a practical recovery activity, hear students teach it back, and verify the learning still holds three days later—even in classrooms sharing devices or using printed worksheets.”**

**Important:** This is a specification and agent prompt pack, **not** a claim that the web application has already been implemented, tested, or deployed.
