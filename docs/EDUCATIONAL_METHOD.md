# Explainable learning intelligence

This is a deterministic teaching aid, not a clinical diagnosis or an automated grade.

Only completed diagnostic attempts enter concept analytics. For each concept:

* Accuracy = correct / all diagnostic responses; absent evidence is `null`.
* Confidence mismatch = high-confidence wrong / all confidence-bearing responses. Every saved response contains an explicit confidence choice.
* Fewer than two distinct diagnostic question IDs means insufficient evidence. Repeated attempts to a single question do not establish coverage.
* With enough evidence, accuracy below 0.65 OR mismatch at least 0.4 suggests support. Teachers can change these thresholds for the atlas view; defaults are labelled heuristic and are not psychometric validation.
* Each tagged wrong selection contributes its teacher-reviewed misconception description and question/option evidence. Three distinct affected learners are required for a misconception breakout; smaller breakouts are hidden.

Priority = 0.40 × gap prevalence + 0.25 × teacher-authored prerequisite importance + 0.20 × confidence mismatch + 0.15 × recent struggle.

Gap prevalence is the share of sampled learners with at least one wrong diagnostic response for that concept. Recent struggle is the proportion wrong in the most recently published diagnostic set with responses for that concept. Each term is 0–1. The drawer displays each input and its weight. Insufficient-evidence nodes do not receive a priority score. Teacher selection remains explicit; optional override rationale is audited with the assignment.

Activity completion schedules a check 48–72 hours later (default 72). The check is an approved `echo` question on the same concept with both a new question ID and a stem absent from that learner's diagnostic history. Teachers author and verify equivalence. The server enforces due time and answer ownership. No worker is needed: due checks are queried during page load. Demo-only time travel requires an authenticated student in a synthetic organization and explicit `DEMO_MODE=true`.

Teach-back review scores clarity, correctness, example and transfer separately from 0–3. Activity completion never establishes mastery. A verified recovery observation requires a prior wrong classroom diagnostic answer before the intervention, completed activity, reviewed explanation with correctness/example/transfer each at least 2, and a correct distinct delayed check after completion. The evidence is described as **observed improvement in this sample**; there is no causal claim. Retained observations use this same conservative delayed-check definition.

Diagnostic and delayed accuracies have separate denominators. Immediate post-test questions can be authored in the bank, but no immediate post-test runner is implemented; `post_accuracy=null, post_n=0` is explicitly reported. No averaging across stages or student deficit leaderboard is performed.
