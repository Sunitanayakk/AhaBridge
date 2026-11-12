import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  Send,
  Star,
} from "lucide-react";
import { useApp } from "../app/context";
import { api, post } from "../lib/api";
import {
  getLesson,
  loadDraft,
  queue,
  saveDraft,
  saveLesson,
} from "../lib/offline";
import type { Diagnostic, Echo, Mission, Question } from "../lib/types";
import { Drawing } from "../components/Drawing";
import {
  Empty,
  ErrorBox,
  Loading,
  PageTitle,
  Tag,
  useAction,
  when,
} from "../components/ui";

export function Student() {
  const { user, notify } = useApp(),
    q = useQuery({
      queryKey: ["diagnostics"],
      queryFn: () => api<{ items: Diagnostic[] }>("/diagnostics"),
    }),
    [code, setCode] = useState("");
  const join = useAction(
    () => post("/join/" + encodeURIComponent(code)),
    "You joined the classroom.",
  );
  return (
    <section className="section-wrap">
      <PageTitle
        eyebrow="YOUR LEARNING NOTEBOOK"
        title={`Hello, ${user?.display_name}. A fresh start awaits.`}
      >
        A few questions help your teacher choose the right next step. Confidence
        is a clue, never a grade.
      </PageTitle>
      <ErrorBox error={q.error} />
      {q.isPending ? (
        <Loading />
      ) : q.data?.items.length ? (
        <div className="card-grid">
          {q.data.items.map((d) => (
            <article className="paper exercise-card" key={d.id}>
              <Tag tone={d.completed ? "blue" : "yellow"}>
                {d.completed ? "Saved to your notebook" : "Ready when you are"}
              </Tag>
              <h2>{d.title}</h2>
              <p>{d.question_count} questions · go at your own pace</p>
              <Link className="button" to={"/student/exercise/" + d.id}>
                {d.completed ? "See my feedback" : "Open exercise"}{" "}
                <ArrowRight size={18} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <Empty>
          <h2>No exercises yet.</h2>
          <p>Your teacher will publish one here.</p>
        </Empty>
      )}
      <form
        className="paper inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          join.mutate(undefined, {
            onSuccess: () => {
              setCode("");
              notify("Class joined. Your exercises will appear here.");
            },
          });
        }}
      >
        <label>
          Teacher-issued class code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            minLength={5}
            maxLength={40}
            required
            placeholder="Enter your class code"
          />
        </label>
        <button className="button" disabled={join.isPending}>
          Join class
        </button>
        <ErrorBox error={join.error} />
      </form>
    </section>
  );
}

type ExerciseData = { id: string; title: string; questions: Question[] };
export function Exercise() {
  const { id } = useParams(),
    { user, online } = useApp(),
    [attempt, setAttempt] = useState<string | null>(null),
    [answered, setAnswered] = useState<string[]>([]),
    [option, setOption] = useState(""),
    [sure, setSure] = useState<boolean | null>(null),
    [submitted, setSubmitted] = useState(false),
    [queuedFinish, setQueuedFinish] = useState(false),
    [localError, setLocalError] = useState<unknown>(null);
  const query = useQuery({
    queryKey: ["exercise", id],
    queryFn: async () => {
      if (!online) {
        const cached = await getLesson<ExerciseData>(
          user!.id,
          "diagnostic:" + id,
        );
        if (cached) return cached;
        throw new Error(
          "Save and open this exercise online before using it offline.",
        );
      }
      return api<ExerciseData>("/diagnostics/" + id);
    },
  });
  useEffect(() => {
    if (!id || !user) return;
    let alive = true;
    async function begin() {
      try {
        if (online) {
          const a = await post("/student/diagnostics/" + id + "/start");
          if (alive) {
            setAttempt(a.id);
            setAnswered(a.answered_question_ids);
            setSubmitted(a.completed);
          }
          await saveDraft(user!.id, "attempt:" + id, a);
        } else {
          const cached = await loadDraft<{
            id: string;
            answered_question_ids: string[];
            completed: boolean;
          }>(user!.id, "attempt:" + id);
          if (!cached) throw new Error("Start this exercise online first.");
          if (alive) {
            setAttempt(cached.id);
            setAnswered(cached.answered_question_ids);
            setSubmitted(cached.completed);
          }
        }
      } catch (e) {
        if (alive) setLocalError(e);
      }
    }
    void begin();
    return () => {
      alive = false;
    };
  }, [id, user, online]);
  const result = useQuery({
    queryKey: ["result", attempt],
    queryFn: () => api("/student/diagnostics/" + attempt + "/result"),
    enabled: !!attempt && submitted && online,
  });
  const save = useAction(
    async () => {
      if (!attempt || !query.data) return;
      const q = query.data.questions.find((q) => !answered.includes(q.id))!;
      const payload = { question_id: q.id, answer_option_id: option, sure };
      if (online)
        await post("/student/diagnostics/" + attempt + "/answer", payload);
      else await queue(user!.id, "diagnostic_answer", attempt, payload);
      const next = [...answered, q.id];
      setAnswered(next);
      setOption("");
      setSure(null);
      await saveDraft(user!.id, "attempt:" + id, {
        id: attempt,
        answered_question_ids: next,
        completed: false,
      });
    },
    online ? "Answer saved." : "Answer queued on this device.",
  );
  const finish = useAction(
    async () => {
      if (!attempt) throw new Error("Start this exercise online first.");
      if (online) {
        await post("/student/diagnostics/" + attempt + "/finish");
        setSubmitted(true);
      } else {
        await queue(user!.id, "diagnostic_finish", attempt, {});
        setQueuedFinish(true);
      }
    },
    online
      ? "Your exercise is complete."
      : "Submission queued. Reconnect for feedback.",
  );
  const cache = useAction(async () => {
    await saveLesson(user!.id, "diagnostic:" + id, query.data);
  }, "Exercise saved on this device. Start it online before disconnecting.");
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorBox error={query.error} />;
  const data = query.data!;
  const q = data.questions.find((q) => !answered.includes(q.id));
  return (
    <section className="section-wrap narrow">
      <PageTitle eyebrow="SMALL QUESTIONS. USEFUL CLUES." title={data.title}>
        Take your time. “Not sure” is a perfectly useful answer, too.
      </PageTitle>
      <ErrorBox error={localError} />
      <ErrorBox error={save.error || finish.error || cache.error} />
      {submitted ? (
        <div className="paper">
          <Tag>Exercise saved</Tag>
          <h2>Here’s what we can learn.</h2>
          <ErrorBox error={result.error} />
          {result.isPending && online ? (
            <Loading />
          ) : result.data ? (
            <>
              <p>
                {result.data.correct} of {result.data.n} correct. Confidence is
                reported separately.
              </p>
              {result.data.items.map((r: any) => (
                <div className="result-item" key={r.question_id}>
                  <strong>{r.stem}</strong>
                  <p>
                    {r.selected_option}: {r.selected_text}
                  </p>
                  <Tag tone={r.correct ? "blue" : "yellow"}>
                    {r.correct ? "Correct response" : "An idea to revisit"}
                  </Tag>{" "}
                  <span>{r.sure ? "You felt sure" : "You weren’t sure"}</span>
                  <p>{r.feedback}</p>
                  {r.possible_misconception && (
                    <p className="method-note">
                      Possible misunderstanding: {r.possible_misconception}.
                      This is a clue, not a diagnosis.
                    </p>
                  )}
                </div>
              ))}
            </>
          ) : (
            <p>Reconnect to view your feedback.</p>
          )}
          <Link className="button" to="/student/missions">
            See my bridge missions <ArrowRight size={18} />
          </Link>
        </div>
      ) : queuedFinish ? (
        <Empty>
          <h2>Safe in this device’s notebook.</h2>
          <p>
            Your answers and submission are queued. Reconnect while signed in to
            sync them and see feedback.
          </p>
        </Empty>
      ) : (
        <div className="paper question-sheet">
          <div className="question-topline">
            <Tag tone="yellow">
              {Math.min(answered.length + 1, data.questions.length)} /{" "}
              {data.questions.length}
            </Tag>
            <button
              className="text-button"
              disabled={!online || cache.isPending}
              onClick={() => cache.mutate()}
            >
              <Download size={17} />
              Save for offline
            </button>
          </div>
          <progress
            max={data.questions.length}
            value={answered.length}
            aria-label="Questions answered"
          />
          {q ? (
            <>
              <h2>{q.stem}</h2>
              <fieldset>
                <legend>Choose one answer</legend>
                <div className="answer-options">
                  {q.options.map((o) => (
                    <label
                      className={
                        "answer-option " + (option === o.id ? "chosen" : "")
                      }
                      key={o.id}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={o.id}
                        checked={option === o.id}
                        onChange={() => setOption(o.id)}
                      />
                      <span className="option-letter">{o.label}</span>
                      <span>{o.text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="confidence">
                <legend>How do you feel about your answer?</legend>
                <label className={sure === true ? "chosen" : ""}>
                  <input
                    type="radio"
                    name="confidence"
                    checked={sure === true}
                    onChange={() => setSure(true)}
                  />
                  I’m sure
                </label>
                <label className={sure === false ? "chosen" : ""}>
                  <input
                    type="radio"
                    name="confidence"
                    checked={sure === false}
                    onChange={() => setSure(false)}
                  />
                  I’m not sure
                </label>
              </fieldset>
              <button
                className="button button-yellow"
                disabled={
                  !option || sure === null || !attempt || save.isPending
                }
                onClick={() => save.mutate()}
              >
                {save.isPending ? "Saving…" : "Save & continue"}{" "}
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <>
              <h2>Ready to turn the page?</h2>
              <p>Your answers are saved. Submit to see supportive feedback.</p>
              <button
                className="button button-yellow"
                disabled={finish.isPending || !attempt}
                onClick={() => finish.mutate()}
              >
                Submit exercise <CheckCircle2 size={18} />
              </button>
            </>
          )}
        </div>
      )}
      <p className="privacy-note">
        Shared device? Saved exercises and drafts are erased when you sign out.
      </p>
      <Link className="text-link" to="/student">
        Back to my exercises
      </Link>
    </section>
  );
}

export function Missions() {
  const { user, online } = useApp(),
    query = useQuery({
      queryKey: ["missions"],
      queryFn: async () => {
        if (!online) {
          const data = await getLesson<{ items: Mission[] }>(
            user!.id,
            "missions",
          );
          if (data) return data;
          throw new Error(
            "Save your missions on this device while online first.",
          );
        }
        return api<{ items: Mission[] }>("/student/bridge-assignments");
      },
    }),
    cache = useAction(
      async () => saveLesson(user!.id, "missions", query.data),
      "Your current approved missions are saved on this device.",
    );
  return (
    <section className="section-wrap">
      <PageTitle eyebrow="BUILD A BRIDGE" title="Try it. Make it. Explain it.">
        Practical missions selected by your teacher. Completing one opens a new
        question in 72 hours.
      </PageTitle>
      <ErrorBox error={query.error || cache.error} />
      {query.isPending ? (
        <Loading />
      ) : query.data?.items.length ? (
        <>
          <button
            className="button button-small"
            disabled={!online || cache.isPending}
            onClick={() => cache.mutate()}
          >
            <Download size={17} />
            Save missions for offline
          </button>
          <div className="mission-grid">
            {query.data.items.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </div>
        </>
      ) : (
        <Empty>
          <h2>No bridge missions assigned yet.</h2>
          <p>
            Try an exercise first. Your teacher can choose a useful next step.
          </p>
          <Link className="button" to="/student">
            My exercises
          </Link>
        </Empty>
      )}
    </section>
  );
}
function MissionCard({ mission: m }: { mission: Mission }) {
  const { user, online } = useApp(),
    [text, setText] = useState(""),
    [drawing, setDrawing] = useState<{ x: number; y: number }[][]>([]),
    [locallyComplete, setLocallyComplete] = useState(false),
    [locallySubmitted, setLocallySubmitted] = useState(false),
    [draftError, setDraftError] = useState(""),
    [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    void loadDraft<{ text: string; drawing: { x: number; y: number }[][] }>(
      user!.id,
      m.id,
    )
      .then((v) => {
        if (v) {
          setText(v.text);
          setDrawing(v.drawing);
        }
        setDraftLoaded(true);
      })
      .catch(() => {
        setDraftError("Local drafts are unavailable. Use online submission.");
        setDraftLoaded(true);
      });
  }, [m.id, user]);
  useEffect(() => {
    if (!draftLoaded) return;
    const timer = setTimeout(
      () =>
        void saveDraft(user!.id, m.id, { text, drawing }).catch(() =>
          setDraftError("Draft could not be saved on this device."),
        ),
      500,
    );
    return () => clearTimeout(timer);
  }, [text, drawing, m.id, user, draftLoaded]);
  const complete = useAction(
    async () => {
      if (online)
        await post("/student/bridge-assignments/" + m.id + "/complete");
      else {
        await queue(user!.id, "bridge_complete", m.id, {});
        setLocallyComplete(true);
      }
    },
    online
      ? "Activity complete. Your Echo Check is scheduled."
      : "Activity completion queued.",
  );
  const submit = useAction(
    async () => {
      const data = { bridge_assignment_id: m.id, text_body: text, drawing };
      if (online) await post("/student/teachbacks", data);
      else {
        await queue(user!.id, "teachback", m.id, data);
        setLocallySubmitted(true);
      }
    },
    online
      ? "Teach-back sent to your teacher."
      : "Teach-back queued on this device.",
  );
  const b = m.activity;
  return (
    <article className="paper mission-card">
      <Tag tone="yellow">
        {b.minutes} min · {b.mode.replace("_", " ")} ·{" "}
        {b.language.toUpperCase()}
      </Tag>
      <h2>{b.title}</h2>
      <details open>
        <summary>01 · Gather your materials</summary>
        <ul>
          {b.materials.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>
      <details open>
        <summary>02 · Try it in the real world</summary>
        <ol>
          {b.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <h3>What to look for</h3>
        <ul>
          {b.success_criteria.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>
      {!m.completed_at && !locallyComplete ? (
        <button
          className="button button-yellow"
          disabled={complete.isPending}
          onClick={() => complete.mutate()}
        >
          I’ve tried the activity <CheckCircle2 size={18} />
        </button>
      ) : (
        <>
          <p className="completion-note">
            <CheckCircle2 size={19} />
            Activity complete.{" "}
            {m.echo_due_at
              ? "Echo Check: " + when(m.echo_due_at)
              : "Echo scheduling will sync online."}
          </p>
          <details open>
            <summary>03 · Teach it back</summary>
            {m.teachback ? (
              <div>
                <Tag>
                  {m.teachback.review_state === "reviewed"
                    ? "Teacher reviewed"
                    : "Waiting for teacher review"}
                </Tag>
                <p>{m.teachback.text_body}</p>
                {m.teachback.feedback && (
                  <blockquote>{m.teachback.feedback}</blockquote>
                )}
                {m.teachback.rubric && (
                  <ul>
                    {Object.entries(m.teachback.rubric).map(([k, v]) => (
                      <li key={k}>
                        {k}: {v}/3
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : locallySubmitted ? (
              <p role="status">
                Your explanation is queued. Reconnect to send it.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit.mutate();
                }}
              >
                <label>
                  Explain the idea in your own words
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    minLength={15}
                    maxLength={6000}
                    required
                    placeholder="What changed in your understanding? Show a new example."
                    rows={5}
                  />
                </label>
                <small>
                  {draftError ||
                    "Draft saved on this device while editing. Text is enough; drawing is optional."}
                </small>
                <Drawing value={drawing} onChange={setDrawing} />
                <button
                  className="button button-yellow"
                  disabled={submit.isPending || text.trim().length < 15}
                >
                  <Send size={18} />
                  Send to my teacher
                </button>
              </form>
            )}
          </details>
        </>
      )}
      <ErrorBox error={complete.error || submit.error} />
      <p className="method-note">
        Completion and submission are steps in learning. Your teacher reviews
        the explanation; they do not automatically mean mastery.
      </p>
    </article>
  );
}
export function Echoes() {
  const { demo } = useApp(),
    query = useQuery({
      queryKey: ["echoes"],
      queryFn: () => api<{ items: Echo[] }>("/student/echo-checks"),
    });
  return (
    <section className="section-wrap">
      <PageTitle eyebrow="THE ECHO CHECK" title="Let’s see what stayed.">
        A different problem, the same idea. Checks become available 72 hours
        after you complete a bridge.
      </PageTitle>
      <ErrorBox error={query.error} />
      {query.isPending ? (
        <Loading />
      ) : query.data?.items.length ? (
        <div className="card-grid">
          {query.data.items.map((e) => (
            <EchoCard key={e.id} echo={e} demo={demo} />
          ))}
        </div>
      ) : (
        <Empty>
          <Clock3 size={36} />
          <h2>Nothing due just yet.</h2>
          <p>Complete a bridge mission to schedule your first Echo Check.</p>
          <Link className="button" to="/student/missions">
            See bridge missions
          </Link>
        </Empty>
      )}
    </section>
  );
}
function EchoCard({ echo: e, demo }: { echo: Echo; demo: boolean }) {
  const [option, setOption] = useState(""),
    [feedback, setFeedback] = useState<{
      correct: boolean;
      feedback: string;
    } | null>(null),
    answer = useAction(async () => {
      const data = await post("/student/echo-checks/" + e.id + "/answer", {
        answer_option_id: option,
      });
      setFeedback(data);
    }, "Echo response saved."),
    due = useAction(
      () => post("/demo/echo-checks/" + e.id + "/make-due"),
      "Synthetic clock advanced for this check only.",
    );
  return (
    <article className="paper">
      <Tag tone="yellow">
        {e.answered_at
          ? "Assessed"
          : e.due
            ? "Ready to revisit"
            : "Not yet assessed"}
      </Tag>
      <h2>{e.title}</h2>
      <p>
        <Clock3 size={17} /> Due {when(e.due_at)}
      </p>
      {feedback ? (
        <p role="status">{feedback.feedback}</p>
      ) : e.answered_at ? (
        <p className="result-item">
          {e.correct ? (
            <>
              <Star size={22} />
              Correct on a new equivalent problem.
            </>
          ) : (
            "This idea could use another bridge. Your teacher can help."
          )}
        </p>
      ) : e.question ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            answer.mutate();
          }}
        >
          <h3>{e.question.stem}</h3>
          <fieldset>
            <legend>Choose one answer</legend>
            {e.question.options.map((o) => (
              <label className="answer-option" key={o.id}>
                <input
                  type="radio"
                  name={"echo-" + e.id}
                  checked={option === o.id}
                  onChange={() => setOption(o.id)}
                />
                {o.label} · {o.text}
              </label>
            ))}
          </fieldset>
          <button
            className="button button-yellow"
            disabled={!option || answer.isPending}
          >
            Save Echo Check <ArrowRight size={18} />
          </button>
        </form>
      ) : (
        <p>A little time helps check transfer. Come back when this is due.</p>
      )}
      {demo && !e.answered_at && !e.due && (
        <button
          className="text-button"
          disabled={due.isPending}
          onClick={() => due.mutate()}
        >
          Synthetic demo only: make this check due
        </button>
      )}
      <ErrorBox error={answer.error || due.error} />
      <p className="method-note">
        Correctness is one observation from a small sample. A missed check is
        not a failure.
      </p>
    </article>
  );
}
