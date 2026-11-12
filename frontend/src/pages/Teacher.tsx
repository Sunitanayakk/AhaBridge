import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Check,
  Download,
  Lightbulb,
  Plus,
  Printer,
} from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useApp } from "../app/context";
import { api, post } from "../lib/api";
import type {
  Bridge,
  Classroom,
  Insights,
  Node,
  Teachback,
} from "../lib/types";
import { AtlasView } from "../features/Atlas";
import { Drawing } from "../components/Drawing";
import {
  Empty,
  ErrorBox,
  Loading,
  PageTitle,
  Tag,
  useAction,
  percent,
  when,
} from "../components/ui";
export function useClassroom() {
  const [chosen, setChosen] = useState(""),
    query = useQuery({
      queryKey: ["classes"],
      queryFn: () => api<{ items: Classroom[] }>("/teacher/classes"),
    }),
    id = chosen || query.data?.items[0]?.id || "";
  return { id, query, chosen, setChosen };
}
export function ClassSelect({
  id,
  onChange,
  items,
}: {
  id: string;
  onChange: (id: string) => void;
  items: Classroom[];
}) {
  return (
    <label className="class-picker">
      Classroom
      <select value={id} onChange={(e) => onChange(e.target.value)}>
        {items.map((c) => (
          <option value={c.id} key={c.id}>
            {c.title}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Teacher() {
  const { user } = useApp(),
    { id, query: classes, setChosen } = useClassroom(),
    [showCreate, setShowCreate] = useState(false),
    [title, setTitle] = useState(""),
    [grade, setGrade] = useState("7"),
    [joinCode, setJoinCode] = useState(""),
    [cutoff, setCutoff] = useState(".65"),
    [mismatch, setMismatch] = useState(".4"),
    [applied, setApplied] = useState({ cutoff: ".65", mismatch: ".4" });
  const atlas = useQuery({
      queryKey: ["atlas", id, applied],
      queryFn: () =>
        api<{ items: Node[] }>(
          `/teacher/classes/${id}/atlas?accuracy_cutoff=${applied.cutoff}&confidence_cutoff=${applied.mismatch}`,
        ),
      enabled: !!id,
    }),
    stats = useQuery({
      queryKey: ["insights", id],
      queryFn: () => api<Insights>("/teacher/classes/" + id + "/insights"),
      enabled: !!id,
    }),
    create = useAction(async () => {
      const c = await post("/teacher/classes", {
        title,
        grade_band: grade,
        subject: "Mathematics",
      });
      setChosen(c.id);
      setJoinCode(c.join_code);
      setShowCreate(false);
      setTitle("");
    }, "Classroom created. Save the join code now."),
    rotate = useAction(async () => {
      const data = await post("/teacher/classes/" + id + "/join-code");
      setJoinCode(data.join_code);
    }, "Class code replaced. Previous code no longer works.");
  return (
    <section className="section-wrap">
      <div className="title-with-actions">
        <PageTitle
          eyebrow="THE TEACHER’S NOTEBOOK"
          title={`A little clarity for your next 15 minutes.`}
        >
          Welcome, {user?.display_name}. Follow the evidence. Find a practical
          next step.
        </PageTitle>
        <button
          className="button button-small"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus size={18} />
          New classroom
        </button>
      </div>
      <ErrorBox error={classes.error || create.error || rotate.error} />
      {showCreate && (
        <form
          className="paper inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <label>
            Classroom title
            <input
              required
              minLength={3}
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Grade
            <input
              required
              maxLength={40}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
          </label>
          <button className="button" disabled={create.isPending}>
            Create classroom
          </button>
        </form>
      )}
      {joinCode && (
        <div className="sticky code-note">
          <strong>
            Share this code privately: <code>{joinCode}</code>
          </strong>
          <p>
            Shown only when created or replaced. It enrolls existing student
            accounts from your organization.
          </p>
          <button className="text-button" onClick={() => setJoinCode("")}>
            I’ve saved it
          </button>
        </div>
      )}
      {classes.isPending ? (
        <Loading />
      ) : !id ? (
        <Empty>
          <h2>Your first classroom starts here.</h2>
          <p>Create a class, provision learners, and publish a diagnostic.</p>
        </Empty>
      ) : (
        <>
          <div className="workspace-toolbar">
            <ClassSelect
              id={id}
              items={classes.data?.items || []}
              onChange={(v) => {
                setChosen(v);
                setJoinCode("");
              }}
            />
            <div className="toolbar-actions">
              <Link className="button button-small" to="/teacher/author">
                <Plus size={17} />
                Author & invite
              </Link>
              <Link className="button button-small" to={"/teacher/print/" + id}>
                <Printer size={17} />
                Print pack
              </Link>
              <button
                className="text-button"
                disabled={rotate.isPending}
                onClick={() => rotate.mutate()}
              >
                Replace class code
              </button>
            </div>
          </div>
          {stats.data && (
            <div className="metric-grid">
              <div className="paper metric">
                <span>Clues collected</span>
                <strong>{stats.data.questions_attempted}</strong>
                <small>completed diagnostic responses</small>
              </div>
              <div className="paper metric metric-yellow">
                <span>Where a bridge may help</span>
                <strong>{stats.data.concepts_needing_attention}</strong>
                <small>concepts with enough evidence</small>
              </div>
              <div className="paper metric">
                <span>Explanations heard</span>
                <strong>{stats.data.teachbacks_reviewed}</strong>
                <small>teach-backs reviewed by teacher</small>
              </div>
              <div className="paper metric">
                <span>Still holding, later</span>
                <strong>{stats.data.retained}</strong>
                <small>verified recovery observations</small>
              </div>
            </div>
          )}
          <div className="section-heading">
            <div>
              <p className="eyebrow">CONNECT THE DOTS</p>
              <h2>Your classroom rescue map</h2>
            </div>
            <p>
              Ideas need support. Children need encouragement.
              <br />
              Select a concept for the evidence behind it.
            </p>
          </div>
          <ErrorBox error={atlas.error || stats.error} />
          {atlas.isPending ? (
            <Loading />
          ) : (
            atlas.data && <AtlasView nodes={atlas.data.items} />
          )}
          <details className="threshold-settings">
            <summary>Adjust heuristic thresholds for this view</summary>
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                setApplied({ cutoff, mismatch });
              }}
            >
              <label>
                Accuracy below
                <input
                  type="number"
                  min="0"
                  max="1"
                  step=".05"
                  value={cutoff}
                  onChange={(e) => setCutoff(e.target.value)}
                />
              </label>
              <label>
                Confident wrong at least
                <input
                  type="number"
                  min="0"
                  max="1"
                  step=".05"
                  value={mismatch}
                  onChange={(e) => setMismatch(e.target.value)}
                />
              </label>
              <button className="button button-small">Apply to atlas</button>
            </form>
            <p>
              Defaults are demo heuristics, not validated psychometrics. Insight
              totals use the documented default thresholds.
            </p>
          </details>
          <div className="next-step-banner sticky">
            <Lightbulb size={28} />
            <div>
              <h3>Evidence is a starting point. You choose the bridge.</h3>
              <p>
                Activities use paper, everyday measurements and local examples.
                Teacher approval stays part of the loop.
              </p>
            </div>
            <Link to="/teacher/bridges" className="text-link">
              Open planner <ArrowUpRight size={20} />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

export function Planner() {
  const { id, query: classes, setChosen } = useClassroom(),
    [concept, setConcept] = useState(
      new URLSearchParams(location.search).get("concept") || "",
    ),
    [mode, setMode] = useState(""),
    [lang, setLang] = useState(""),
    [student, setStudent] = useState(""),
    [selected, setSelected] = useState<Bridge | null>(null),
    [override, setOverride] = useState(""),
    [editing, setEditing] = useState<Bridge | null>(null);
  const bridges = useQuery({
      queryKey: ["bridges"],
      queryFn: () => api<{ items: Bridge[] }>("/bridges"),
    }),
    classDetail = useQuery({
      queryKey: ["class", id],
      queryFn: () => api<Classroom>("/teacher/classes/" + id),
      enabled: !!id,
    }),
    concepts = useQuery({
      queryKey: ["concepts"],
      queryFn: () => api("/concepts"),
    }),
    assign = useAction(
      () =>
        post("/teacher/bridge-assignments", {
          classroom_id: id,
          student_id: student,
          bridge_activity_id: selected!.id,
          override_reason: override,
        }),
      "Bridge assigned to this learner.",
    ),
    approve = useAction(
      (id: string) => post("/bridges/" + id + "/approve"),
      "Activity approved.",
    ),
    copy = useAction(async () => {
      const b = editing!;
      const {
        id: _id,
        approved_by: _approved,
        version: _version,
        ...content
      } = b;
      await post("/bridges", content);
      setEditing(null);
    }, "Edited activity saved as a new version. Approve before assigning.");
  const filtered =
    bridges.data?.items.filter(
      (b) =>
        (!concept || b.concept_id === concept) &&
        (!mode || b.mode === mode) &&
        (!lang || b.language === lang),
    ) || [];
  return (
    <section className="section-wrap">
      <PageTitle
        eyebrow="THE BRIDGE PLANNER"
        title="Make the next step a practical one."
      >
        Choose a reviewed activity. Adapt it to your classroom. Approve it, then
        assign it.
      </PageTitle>
      <div className="workspace-toolbar">
        <ClassSelect
          id={id}
          onChange={(v) => {
            setChosen(v);
            setStudent("");
          }}
          items={classes.data?.items || []}
        />
        <label>
          Concept
          <select value={concept} onChange={(e) => setConcept(e.target.value)}>
            <option value="">All concepts</option>
            {concepts.data?.items.map((c: any) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Access mode
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="">All modes</option>
            <option value="hands_on">Hands-on</option>
            <option value="printable">Printable</option>
            <option value="digital">Digital</option>
          </select>
        </label>
        <label>
          Activity language
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="">All languages</option>
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="or">ଓଡ଼ିଆ</option>
          </select>
        </label>
      </div>
      <ErrorBox
        error={
          bridges.error ||
          classes.error ||
          classDetail.error ||
          concepts.error ||
          assign.error ||
          approve.error ||
          copy.error
        }
      />
      {bridges.isPending ? (
        <Loading />
      ) : !filtered.length ? (
        <Empty>
          <h2>No activity matches these filters.</h2>
          <p>Try another mode or author an activity using the form below.</p>
        </Empty>
      ) : (
        <div className="bridge-grid">
          {filtered.map((b) => (
            <article
              key={b.id}
              className={
                "paper bridge-card " + (b.mode === "hands_on" ? "sticky" : "")
              }
            >
              <div className="card-topline">
                <Tag>{b.mode.replace("_", " ")}</Tag>
                <span>
                  {b.minutes} min · {b.language.toUpperCase()}
                </span>
              </div>
              <h2>{b.title}</h2>
              <p>
                <strong>Bring:</strong> {b.materials.join(", ")}
              </p>
              <details>
                <summary>Unfold the activity</summary>
                <ol>
                  {b.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <h3>Observable success</h3>
                <ul>
                  {b.success_criteria.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </details>
              <div className="card-actions">
                {b.approved_by ? (
                  <button
                    className="button button-small"
                    onClick={() => {
                      setSelected(b);
                      setStudent("");
                    }}
                  >
                    Assign bridge <ArrowUpRight size={16} />
                  </button>
                ) : (
                  <button
                    className="button button-small"
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(b.id)}
                  >
                    Approve activity <Check size={16} />
                  </button>
                )}
                <button
                  className="text-button"
                  onClick={() => setEditing(structuredClone(b))}
                >
                  Edit a copy
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <form
          className="paper assignment-form"
          onSubmit={(e) => {
            e.preventDefault();
            assign.mutate(undefined, { onSuccess: () => setSelected(null) });
          }}
        >
          <h2>Assign: {selected.title}</h2>
          <label>
            Learner in selected classroom
            <select
              required
              value={student}
              onChange={(e) => setStudent(e.target.value)}
            >
              <option value="">Choose a learner</option>
              {classDetail.data?.students?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Teacher choice / override rationale (optional)
            <textarea
              maxLength={500}
              value={override}
              onChange={(e) => setOverride(e.target.value)}
              placeholder="Why this activity fits this learner and their access preference"
            />
          </label>
          <button
            className="button button-yellow"
            disabled={!student || assign.isPending}
          >
            Confirm assignment
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setSelected(null)}
          >
            Cancel
          </button>
        </form>
      )}
      {editing && (
        <form
          className="paper"
          onSubmit={(e) => {
            e.preventDefault();
            copy.mutate();
          }}
        >
          <h2>Adapt an activity</h2>
          <label>
            Title
            <input
              required
              value={editing.title}
              onChange={(e) =>
                setEditing({ ...editing, title: e.target.value })
              }
            />
          </label>
          <label>
            Materials · one per line
            <textarea
              required
              value={editing.materials.join("\n")}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  materials: e.target.value.split("\n"),
                })
              }
            />
          </label>
          <label>
            Steps · one per line
            <textarea
              required
              rows={5}
              value={editing.steps.join("\n")}
              onChange={(e) =>
                setEditing({ ...editing, steps: e.target.value.split("\n") })
              }
            />
          </label>
          <label>
            Success criteria · one per line
            <textarea
              required
              value={editing.success_criteria.join("\n")}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  success_criteria: e.target.value.split("\n"),
                })
              }
            />
          </label>
          <button className="button" disabled={copy.isPending}>
            Save new activity for approval
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setEditing(null)}
          >
            Cancel
          </button>
        </form>
      )}
      <NewActivity concepts={concepts.data?.items || []} />
    </section>
  );
}
function NewActivity({
  concepts,
}: {
  concepts: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false),
    save = useAction(
      (data: unknown) => post("/bridges", data),
      "New activity saved. Review and approve it before assignment.",
    );
  return (
    <details
      className="paper author-panel"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>Author an original bridge activity</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          save.mutate(
            {
              concept_id: f.get("concept"),
              title: f.get("title"),
              mode: f.get("mode"),
              language: f.get("language"),
              minutes: Number(f.get("minutes")),
              materials: String(f.get("materials")).split("\n"),
              steps: String(f.get("steps")).split("\n"),
              success_criteria: String(f.get("criteria")).split("\n"),
            },
            { onSuccess: () => setOpen(false) },
          );
        }}
      >
        <label>
          Concept
          <select name="concept" required>
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Activity title
          <input name="title" required minLength={3} maxLength={160} />
        </label>
        <div className="form-columns">
          <label>
            Mode
            <select name="mode">
              <option value="hands_on">Hands-on</option>
              <option value="printable">Printable</option>
              <option value="digital">Digital</option>
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
          <label>
            Minutes
            <input
              name="minutes"
              type="number"
              min={5}
              max={30}
              defaultValue={12}
              required
            />
          </label>
        </div>
        <label>
          Materials · one per line
          <textarea name="materials" required />
        </label>
        <label>
          Steps · at least two lines
          <textarea name="steps" rows={4} required />
        </label>
        <label>
          Observable success criteria · one per line
          <textarea name="criteria" required />
        </label>
        <ErrorBox error={save.error} />
        <button className="button" disabled={save.isPending}>
          Save for approval
        </button>
      </form>
    </details>
  );
}

export function Reviews() {
  const query = useQuery({
    queryKey: ["teachbacks"],
    queryFn: () => api<{ items: Teachback[] }>("/teacher/teachbacks"),
  });
  return (
    <section className="section-wrap">
      <PageTitle
        eyebrow="THE TEACH-BACK STUDIO"
        title="Listen for the idea taking shape."
      >
        Supportive feedback on clarity, correctness, examples and transfer. Each
        dimension uses a 0–3 rubric.
      </PageTitle>
      <ErrorBox error={query.error} />
      {query.isPending ? (
        <Loading />
      ) : query.data?.items.length ? (
        <div className="review-grid">
          {query.data.items.map((t) => (
            <ReviewCard key={t.id} teachback={t} />
          ))}
        </div>
      ) : (
        <Empty>
          <h2>No explanations to review yet.</h2>
          <p>Assign a bridge and invite learners to explain the idea.</p>
        </Empty>
      )}
    </section>
  );
}
function ReviewCard({ teachback: t }: { teachback: Teachback }) {
  const [feedback, setFeedback] = useState(""),
    [rubric, setRubric] = useState({
      clarity: 2,
      correctness: 2,
      example: 2,
      transfer: 2,
    }),
    review = useAction(
      () =>
        post("/teacher/teachbacks/" + t.id + "/review", { feedback, rubric }),
      "Supportive review saved.",
    );
  return (
    <article className="paper">
      <Tag tone={t.review_state === "reviewed" ? "blue" : "yellow"}>
        {t.review_state === "reviewed" ? "Reviewed" : "Ready for your review"}
      </Tag>
      <h2>{t.student_name}</h2>
      <p>{t.activity}</p>
      <blockquote>{t.text_body}</blockquote>
      {t.drawing?.length > 0 && <Drawing value={t.drawing} readOnly />}
      {t.review_state === "reviewed" ? (
        <>
          <p>
            <strong>Your feedback:</strong> {t.feedback}
          </p>
          <ul>
            {Object.entries(t.rubric || {}).map(([k, v]) => (
              <li key={k}>
                {k}: {v}/3
              </li>
            ))}
          </ul>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            review.mutate();
          }}
        >
          <p className="method-note">
            0 = not shown · 1 = emerging · 2 = clear · 3 = independently
            applied. Review the actual explanation; these are teacher
            observations.
          </p>
          <div className="rubric-grid">
            {Object.entries(rubric).map(([key, value]) => (
              <label key={key}>
                {key}
                <select
                  value={value}
                  onChange={(e) =>
                    setRubric({ ...rubric, [key]: Number(e.target.value) })
                  }
                >
                  {[0, 1, 2, 3].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <label>
            Supportive feedback
            <textarea
              required
              minLength={5}
              maxLength={2000}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What is clear? What should the learner try next?"
            />
          </label>
          <ErrorBox error={review.error} />
          <button className="button button-yellow" disabled={review.isPending}>
            Save teacher review <Check size={18} />
          </button>
        </form>
      )}
    </article>
  );
}

export function Impact() {
  const { id, query: classes, setChosen } = useClassroom(),
    { notify } = useApp(),
    query = useQuery({
      queryKey: ["insights", id],
      queryFn: () => api<Insights>("/teacher/classes/" + id + "/insights"),
      enabled: !!id,
    }),
    data = query.data;
  function exportCSV() {
    if (!data) return;
    const keys = [
      "questions_attempted",
      "concepts_sampled",
      "concepts_needing_attention",
      "bridges_assigned",
      "bridges_completed",
      "teachbacks_reviewed",
      "echo_due",
      "echo_completed",
      "verified_recoveries",
      "retained",
      "delayed_accuracy",
      "delayed_n",
      "as_of",
    ] as const;
    const blob = new Blob(
        [
          "metric,value\n" +
            keys.map((k) => `${k},${data[k] ?? "not_assessed"}`).join("\n"),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "ahabridge-classroom-evidence.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify("Aggregate evidence exported. No learner names included.");
  }
  const bars = data
    ? [
        { name: "Activities assigned", n: data.bridges_assigned },
        { name: "Activities completed", n: data.bridges_completed },
        { name: "Explanations reviewed", n: data.teachbacks_reviewed },
        { name: "Echoes completed", n: data.echo_completed },
        { name: "Recovery observations", n: data.verified_recoveries },
      ]
    : [];
  return (
    <section className="section-wrap">
      <PageTitle
        eyebrow="LEARNING EVIDENCE, WITH CONTEXT"
        title="Small steps we can actually see."
      >
        Counts, dates, and clear denominators. No leaderboards. No invented
        mastery scores.
      </PageTitle>
      <div className="workspace-toolbar">
        <ClassSelect
          id={id}
          onChange={setChosen}
          items={classes.data?.items || []}
        />
        <button
          className="button button-small"
          disabled={!data}
          onClick={exportCSV}
        >
          <Download size={17} />
          Export aggregate CSV
        </button>
      </div>
      <ErrorBox error={classes.error || query.error} />
      {query.isPending && id ? (
        <Loading />
      ) : data ? (
        <>
          <div className="metric-grid">
            <div className="paper metric">
              <strong>{data.questions_attempted}</strong>
              <span>diagnostic responses</span>
            </div>
            <div className="paper metric metric-yellow">
              <strong>{data.verified_recoveries}</strong>
              <span>verified recovery observations</span>
            </div>
            <div className="paper metric">
              <strong>{percent(data.delayed_accuracy)}</strong>
              <span>delayed accuracy · N={data.delayed_n}</span>
            </div>
            <div className="paper metric">
              <strong>{data.echo_due}</strong>
              <span>Echo Checks due · not yet assessed</span>
            </div>
          </div>
          <div className="paper">
            <h2>The classroom learning loop</h2>
            <div className="chart-box" aria-hidden="true">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={bars}
                  layout="vertical"
                  margin={{ left: 10, right: 25 }}
                >
                  <CartesianGrid strokeDasharray="4 5" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={170} />
                  <Tooltip />
                  <Bar
                    dataKey="n"
                    fill="#a9cce6"
                    stroke="#2d2d2d"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table>
              <caption>
                Each count is the number of records at that stage, not a rate.
              </caption>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>N</th>
                </tr>
              </thead>
              <tbody>
                {bars.map((b) => (
                  <tr key={b.name}>
                    <th scope="row">{b.name}</th>
                    <td>{b.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sticky method-note">
            <h3>What these numbers mean</h3>
            <p>{data.explanation}</p>
            <p>
              Diagnostic response counts include completed exercises only. Echo
              accuracy uses completed delayed checks only. No independent
              immediate post-test has been collected; post accuracy is not
              assessed.
            </p>
            <p>
              As of {when(data.as_of)}. All preloaded demo records are
              synthetic.
            </p>
          </div>
        </>
      ) : (
        !id && (
          <Empty>
            <p>Create a classroom to collect evidence.</p>
          </Empty>
        )
      )}
    </section>
  );
}
export function PrintPack() {
  const { id } = useParams(),
    q = useQuery({
      queryKey: ["print-pack", id],
      queryFn: () => api("/teacher/classes/" + id + "/print-pack"),
    });
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  return (
    <section className="section-wrap print-pack">
      <div className="print-toolbar">
        <button className="button" onClick={() => window.print()}>
          <Printer size={18} />
          Print / save PDF
        </button>
        <Link className="text-link" to="/teacher">
          Back to atlas
        </Link>
      </div>
      <PageTitle
        eyebrow="LOW-INK CLASSROOM INTERVENTION PACK"
        title={q.data.classroom.title}
      >
        Teacher-selected teaching materials · keep learner response sheets
        private.
      </PageTitle>
      {q.data.activities.map((b: Bridge) => (
        <article key={b.id} className="paper print-card">
          <h2>{b.title}</h2>
          <p>
            {b.minutes} minutes · {b.language} · Materials:{" "}
            {b.materials.join(", ")}
          </p>
          <ol>
            {b.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <h3>Observable success</h3>
          <ul>
            {b.success_criteria.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p>Teach it back: explain the idea and give a different example.</p>
          <div className="writing-lines" aria-hidden="true" />
        </article>
      ))}
      {q.data.diagnostics.map((d: any) => (
        <article key={d.id} className="paper print-card">
          <h2>{d.title} · Response sheet</h2>
          <p>Private sheet code: __________________ · Date: __________</p>
          {d.questions.map((q: any, i: number) => (
            <div key={q.id}>
              <h3>
                {i + 1}. {q.stem}
              </h3>
              {q.options.map((o: any) => (
                <p key={o.id}>
                  □ {o.label} · {o.text}
                </p>
              ))}
              <p>□ I’m sure □ I’m not sure</p>
            </div>
          ))}
        </article>
      ))}
      <p>
        Offline paper work reaches the atlas only after a teacher enters it
        using “Paper responses” in the author workspace.
      </p>
    </section>
  );
}
