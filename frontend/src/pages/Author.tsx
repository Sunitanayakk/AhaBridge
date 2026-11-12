import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { api, post } from "../lib/api";
import type { Diagnostic, Question } from "../lib/types";
import { ClassSelect, useClassroom } from "./Teacher";
import { ErrorBox, PageTitle, Tag, useAction } from "../components/ui";

export function Author() {
  const { id, query: classes, setChosen } = useClassroom(),
    [tab, setTab] = useState("diagnostics"),
    concepts = useQuery({
      queryKey: ["concepts"],
      queryFn: () => api("/concepts"),
    }),
    questions = useQuery({
      queryKey: ["questions"],
      queryFn: () => api<{ items: Question[] }>("/questions"),
    }),
    diagnostics = useQuery({
      queryKey: ["diagnostics"],
      queryFn: () => api<{ items: Diagnostic[] }>("/diagnostics"),
    }),
    [chosenQuestions, setChosenQuestions] = useState<string[]>([]),
    [questionConcept, setQuestionConcept] = useState(""),
    [stage, setStage] = useState("diagnostic"),
    [correct, setCorrect] = useState("A"),
    [tagged, setTagged] = useState(""),
    [tagOption, setTagOption] = useState("B"),
    [prereqs, setPrereqs] = useState<string[]>([]);
  const misconceptions = useQuery({
      queryKey: ["misconceptions", questionConcept],
      queryFn: () => api("/concepts/" + questionConcept + "/misconceptions"),
      enabled: !!questionConcept,
    }),
    saveDiagnostic = useAction(
      (title: string) =>
        post("/diagnostics", {
          title,
          classroom_id: id,
          question_ids: chosenQuestions,
        }),
      "Diagnostic saved as draft.",
    ),
    publish = useAction(
      (id: string) => post("/diagnostics/" + id + "/publish"),
      "Diagnostic published.",
    ),
    createConcept = useAction(
      (data: unknown) => post("/concepts", data),
      "Concept added to the atlas.",
    ),
    createQuestion = useAction(
      (data: unknown) => post("/questions", data),
      "Approved question version saved.",
    ),
    createStudent = useAction(
      (data: unknown) => post("/teacher/students", data),
      "Learner account provisioned. Share their sign-in details privately.",
    ),
    createMisconception = useAction(
      (data: unknown) =>
        post("/concepts/" + questionConcept + "/misconceptions", data),
      "Teacher-reviewed misconception saved.",
    );
  return (
    <section className="section-wrap">
      <PageTitle
        eyebrow="MAKE IT YOUR CLASSROOM"
        title="Good teaching starts with good questions."
      >
        Author original concepts, reviewed distractors and distinct follow-up
        questions. Invite learners privately.
      </PageTitle>
      <ClassSelect
        id={id}
        onChange={setChosen}
        items={classes.data?.items || []}
      />
      <div className="author-tabs" aria-label="Authoring sections">
        {[
          ["diagnostics", "Diagnostic sets"],
          ["concepts", "Concepts & tags"],
          ["questions", "Question bank"],
          ["learners", "Invite learners"],
          ["paper", "Paper responses"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={tab === key}
            className={tab === key ? "selected" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <ErrorBox
        error={
          classes.error ||
          concepts.error ||
          questions.error ||
          diagnostics.error
        }
      />
      {tab === "diagnostics" && (
        <div className="author-columns">
          <form
            className="paper"
            onSubmit={(e) => {
              e.preventDefault();
              saveDiagnostic.mutate(
                String(new FormData(e.currentTarget).get("title")),
              );
            }}
          >
            <h2>A short, thoughtful diagnostic</h2>
            <label>
              Title
              <input name="title" required minLength={3} maxLength={160} />
            </label>
            <fieldset>
              <legend>Select at least two distinct diagnostic questions</legend>
              {questions.data?.items
                .filter((q) => q.source_type === "diagnostic")
                .map((q) => (
                  <label className="check-row" key={q.id}>
                    <input
                      type="checkbox"
                      checked={chosenQuestions.includes(q.id)}
                      onChange={(e) =>
                        setChosenQuestions(
                          e.target.checked
                            ? [...chosenQuestions, q.id]
                            : chosenQuestions.filter((id) => id !== q.id),
                        )
                      }
                    />
                    {q.stem}
                  </label>
                ))}
            </fieldset>
            <ErrorBox error={saveDiagnostic.error} />
            <button
              className="button button-yellow"
              disabled={
                !id || chosenQuestions.length < 2 || saveDiagnostic.isPending
              }
            >
              <Plus size={17} />
              Save draft
            </button>
          </form>
          <div className="paper">
            <h2>Your diagnostic sets</h2>
            {diagnostics.data?.items
              .filter((d) => d.classroom_id === id)
              .map((d) => (
                <div className="list-item" key={d.id}>
                  <h3>{d.title}</h3>
                  <p>
                    {d.question_count} questions · {d.status}
                  </p>
                  {d.status === "draft" && (
                    <button
                      className="button button-small"
                      disabled={publish.isPending}
                      onClick={() => publish.mutate(d.id)}
                    >
                      Publish to classroom
                    </button>
                  )}
                </div>
              ))}
            <ErrorBox error={publish.error} />
          </div>
        </div>
      )}
      {tab === "concepts" && (
        <div className="author-columns">
          <form
            className="paper"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              createConcept.mutate({
                name: f.get("name"),
                slug: f.get("slug"),
                description: f.get("description"),
                importance: Number(f.get("importance")),
                prerequisites: prereqs,
              });
            }}
          >
            <h2>A concept and its connections</h2>
            <label>
              Name
              <input name="name" required minLength={2} maxLength={120} />
            </label>
            <label>
              Unique slug
              <input
                name="slug"
                pattern="[a-z0-9-]{2,80}"
                placeholder="equivalent-fractions"
                required
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                required
                minLength={5}
                maxLength={2000}
              />
            </label>
            <label>
              Prerequisite importance · 0 to 1
              <input
                name="importance"
                type="number"
                min="0"
                max="1"
                step=".05"
                defaultValue=".5"
                required
              />
            </label>
            <fieldset>
              <legend>Existing prerequisites</legend>
              {concepts.data?.items.map((c: any) => (
                <label className="check-row" key={c.id}>
                  <input
                    type="checkbox"
                    checked={prereqs.includes(c.id)}
                    onChange={(e) =>
                      setPrereqs(
                        e.target.checked
                          ? [...prereqs, c.id]
                          : prereqs.filter((id) => id !== c.id),
                      )
                    }
                  />
                  {c.name}
                </label>
              ))}
            </fieldset>
            <ErrorBox error={createConcept.error} />
            <button className="button" disabled={createConcept.isPending}>
              Save concept
            </button>
            <p className="method-note">
              New concepts depend only on existing concepts. This preserves an
              acyclic graph.
            </p>
          </form>
          <form
            className="paper"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              createMisconception.mutate({
                code: f.get("code"),
                description: f.get("description"),
                hint: f.get("hint"),
                teacher_reviewed: true,
              });
            }}
          >
            <h2>A possible misconception</h2>
            <label>
              Concept
              <select
                required
                value={questionConcept}
                onChange={(e) => setQuestionConcept(e.target.value)}
              >
                <option value="">Choose concept</option>
                {concepts.data?.items.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tag code
              <input name="code" required minLength={2} maxLength={80} />
            </label>
            <label>
              Plain-language explanation
              <textarea
                name="description"
                minLength={5}
                maxLength={1000}
                required
              />
            </label>
            <label>
              Bridge hint
              <textarea name="hint" minLength={5} maxLength={1000} required />
            </label>
            <p>
              This save records your teacher review. A selected distractor
              suggests a possibility; it does not establish a diagnosis.
            </p>
            <ErrorBox error={createMisconception.error} />
            <button
              className="button"
              disabled={!questionConcept || createMisconception.isPending}
            >
              Save reviewed tag
            </button>
          </form>
        </div>
      )}
      {tab === "questions" && (
        <div className="author-columns">
          <form
            className="paper"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              createQuestion.mutate({
                concept_id: questionConcept,
                stem: f.get("stem"),
                language: f.get("language"),
                source_type: stage,
                options: ["A", "B", "C", "D"].map((label) => ({
                  label,
                  text: f.get(label),
                  is_correct: label === correct,
                  misconception_id:
                    label === tagOption && label !== correct && tagged
                      ? tagged
                      : null,
                })),
              });
            }}
          >
            <h2>A new question version</h2>
            <label>
              Concept
              <select
                required
                value={questionConcept}
                onChange={(e) => {
                  setQuestionConcept(e.target.value);
                  setTagged("");
                }}
              >
                <option value="">Choose concept</option>
                {concepts.data?.items.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-columns">
              <label>
                Stage
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                >
                  <option value="diagnostic">Diagnostic</option>
                  <option value="echo">Delayed Echo Check</option>
                  <option value="post">Immediate post (bank only)</option>
                </select>
              </label>
              <label>
                Language
                <select name="language">
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="or">Odia</option>
                </select>
              </label>
            </div>
            <label>
              Question
              <textarea name="stem" required minLength={5} maxLength={2000} />
            </label>
            {["A", "B", "C", "D"].map((l) => (
              <label key={l}>
                Option {l}
                <input name={l} required maxLength={500} />
              </label>
            ))}
            <label>
              Exactly one correct answer
              <select
                value={correct}
                onChange={(e) => setCorrect(e.target.value)}
              >
                {["A", "B", "C", "D"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label>
              Tag a wrong option
              <select
                value={tagOption}
                onChange={(e) => setTagOption(e.target.value)}
              >
                {["A", "B", "C", "D"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label>
              Reviewed misconception
              <select
                value={tagged}
                onChange={(e) => setTagged(e.target.value)}
              >
                <option value="">No tag</option>
                {misconceptions.data?.items.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.description}
                  </option>
                ))}
              </select>
            </label>
            <ErrorBox error={createQuestion.error || misconceptions.error} />
            <button
              className="button"
              disabled={!questionConcept || createQuestion.isPending}
            >
              Save & approve version
            </button>
            <p className="method-note">
              Saved question versions are immutable. A distinct Echo question
              must test the same concept with a new problem. The teacher
              verifies equivalence.
            </p>
          </form>
          <div className="paper">
            <h2>Approved question bank</h2>
            {questions.data?.items.map((q) => (
              <details key={q.id}>
                <summary>{q.stem}</summary>
                <Tag>{q.source_type}</Tag>
                <p>
                  {q.language} · ID {q.id.slice(0, 8)}
                </p>
                {q.options.map((o) => (
                  <p key={o.id}>
                    {o.label} · {o.text} {o.is_correct ? "✓ correct" : ""}
                  </p>
                ))}
              </details>
            ))}
          </div>
        </div>
      )}
      {tab === "learners" && (
        <form
          className="paper narrow"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            createStudent.mutate(
              {
                classroom_id: id,
                display_name: f.get("display_name"),
                email: f.get("email"),
                password: f.get("password"),
              },
              { onSuccess: () => e.currentTarget?.reset() },
            );
          }}
        >
          <h2>A private invitation to learn</h2>
          <p>
            Use a pseudonym and a school-issued sign-in identifier. Share the
            password privately with the learner. No public elevated-account
            creation exists.
          </p>
          <label>
            Display name
            <input name="display_name" required minLength={2} maxLength={80} />
          </label>
          <label>
            Sign-in identifier
            <input
              name="email"
              required
              minLength={3}
              maxLength={180}
              placeholder="learner@school.test"
              autoComplete="off"
            />
          </label>
          <label>
            Initial password
            <input
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <ErrorBox error={createStudent.error} />
          <button
            className="button button-yellow"
            disabled={!id || createStudent.isPending}
          >
            <Users size={18} />
            Create learner & enroll
          </button>
        </form>
      )}
      {tab === "paper" && (
        <PaperResponses
          classId={id}
          diagnostics={
            diagnostics.data?.items.filter(
              (d) => d.classroom_id === id && d.status === "published",
            ) || []
          }
        />
      )}
      <p>
        <Link className="text-link" to="/teacher">
          Back to classroom atlas
        </Link>
      </p>
    </section>
  );
}
function PaperResponses({
  classId,
  diagnostics,
}: {
  classId: string;
  diagnostics: Diagnostic[];
}) {
  const [id, setId] = useState(""),
    [answers, setAnswers] = useState<
      Record<string, { answer_option_id: string; sure: boolean }>
    >({}),
    q = useQuery({
      queryKey: ["paper-diagnostic", id],
      queryFn: () => api("/diagnostics/" + id),
      enabled: !!id,
    }),
    save = useAction(
      (source_label: string) =>
        post("/teacher/classes/" + classId + "/print-entries", {
          source_label,
          assignment_id: id,
          answers: Object.entries(answers).map(([question_id, a]) => ({
            question_id,
            ...a,
          })),
        }),
      "Paper response entered and audited.",
    );
  return (
    <form
      className="paper narrow"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(String(new FormData(e.currentTarget).get("source")));
      }}
    >
      <h2>Bring a paper sheet into the atlas</h2>
      <p>
        Use one sheet per entry. Each entry creates an anonymous, inactive paper
        learner to keep counts separate.
      </p>
      <label>
        Published diagnostic
        <select
          required
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setAnswers({});
          }}
        >
          <option value="">Choose diagnostic</option>
          {diagnostics.map((d) => (
            <option value={d.id} key={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Private sheet reference · no real names
        <input name="source" required minLength={3} maxLength={120} />
      </label>
      {q.data?.questions.map((question: Question) => (
        <fieldset key={question.id}>
          <legend>{question.stem}</legend>
          <label>
            Selected option
            <select
              required
              value={answers[question.id]?.answer_option_id || ""}
              onChange={(e) =>
                setAnswers({
                  ...answers,
                  [question.id]: {
                    answer_option_id: e.target.value,
                    sure: answers[question.id]?.sure ?? false,
                  },
                })
              }
            >
              <option value="">Choose response</option>
              {question.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label} · {o.text}
                </option>
              ))}
            </select>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={answers[question.id]?.sure || false}
              onChange={(e) =>
                setAnswers({
                  ...answers,
                  [question.id]: {
                    answer_option_id:
                      answers[question.id]?.answer_option_id || "",
                    sure: e.target.checked,
                  },
                })
              }
            />
            Learner marked “I’m sure”
          </label>
        </fieldset>
      ))}
      <ErrorBox error={q.error || save.error} />
      <button
        className="button"
        disabled={
          !id ||
          save.isPending ||
          Object.keys(answers).length !== q.data?.questions.length
        }
      >
        Save anonymized paper responses
      </button>
    </form>
  );
}
