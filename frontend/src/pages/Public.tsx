import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  HeartHandshake,
  MoveUpRight,
  Pencil,
  Radar,
  Sprout,
  Star,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { HeroDoodleIllustration } from "../components/HeroDoodleIllustration";
import {
  PageTitle,
  Tag,
  Loading,
  ErrorBox,
  Empty,
  percent,
} from "../components/ui";
import { api, post } from "../lib/api";
import { useApp } from "../app/context";
import type { Node } from "../lib/types";
import { AtlasView } from "../features/Atlas";

const steps = [
  {
    icon: Radar,
    name: "Notice the gap",
    text: "A few thoughtful questions. Confidence included.",
    color: "blue",
  },
  {
    icon: Compass,
    name: "Find the why",
    text: "Possible misunderstandings, backed by evidence.",
    color: "yellow",
  },
  {
    icon: HeartHandshake,
    name: "Build a bridge",
    text: "A practical activity, approved by a real teacher.",
    color: "pink",
  },
  {
    icon: Pencil,
    name: "Teach it back",
    text: "Make the idea your own. Explain it simply.",
    color: "blue",
  },
  {
    icon: Sprout,
    name: "Let it stick",
    text: "A new question, three days later.",
    color: "yellow",
  },
];
export function Landing() {
  const reduced = useReducedMotion();
  return (
    <>
      <section className="hero section-wrap">
        <div className="hero-copy">
          <p className="pinned-tag">
            <span aria-hidden="true">✦</span> AIET IDEA HACKATHON · NOVEMBER
            2026
          </p>
          <div className="hero-kicker">
            <span className="scribble-dot" /> A learning recovery studio for
            every classroom
          </div>
          <h1>
            Every mistake
            <br />
            is a <span className="underlined">map</span> to
            <br />
            <span className="blue-word">understanding.</span>
            <svg
              className="heading-spark"
              viewBox="0 0 65 70"
              aria-hidden="true"
            >
              <path
                d="m15 35-9-8m25-5L29 5m14 24L58 13M46 43l17-1"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </h1>
          <p className="hero-description">
            A wrong answer isn’t the end of learning.
            <br />
            It’s where a better explanation begins.
          </p>
          <div className="hero-actions">
            <Link to="/demo" className="button button-yellow">
              Explore demo classroom <ArrowUpRight size={21} />
            </Link>
            <Link to="/login" className="teacher-link">
              I’m a teacher <ArrowRight size={18} />
            </Link>
          </div>
          <p className="hero-footnote">
            <Check size={16} /> Teacher guided <span>·</span> No paid AI needed{" "}
            <span>·</span> Built for real life
          </p>
        </div>
        <div className="hero-visual">
          <HeroDoodleIllustration priority />
          <motion.div
            className="aha-note sticky"
            initial={reduced ? false : { rotate: -3, y: 6 }}
            animate={{ rotate: -3, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="note-star" aria-hidden="true">
              ✧
            </span>
            <span>
              “Ohh…
              <br />
              now I get it!”
            </span>
            <small>That’s the moment we’re here for.</small>
          </motion.div>
        </div>
      </section>
      <div className="principle-strip">
        <span>
          <HeartHandshake size={19} /> Every learner belongs.
        </span>
        <span>
          <Pencil size={19} /> Every explanation matters.
        </span>
        <span>
          <Sprout size={19} /> Every small step counts.
        </span>
        <span className="sdg-mark">
          04{" "}
          <span>
            QUALITY
            <br />
            EDUCATION
          </span>
        </span>
      </div>
      <section id="learning-loop" className="section-wrap loop-section">
        <header className="section-heading">
          <div>
            <p className="eyebrow">SMALL STEPS. LASTING CONNECTIONS.</p>
            <h2>
              Less “try harder.”
              <br />
              More <span className="blue-word">“let’s try this.”</span>
            </h2>
          </div>
          <p>
            Five connected steps that turn a classroom
            <br className="desktop-break" /> struggle into a new starting point.
          </p>
        </header>
        <div className="loop-grid">
          {steps.map((s, i) => (
            <motion.a
              href={`/demo?step=${i}`}
              key={s.name}
              className={`loop-card loop-${s.color}`}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.35 }}
            >
              <span className="step-number">0{i + 1}</span>
              <s.icon size={32} strokeWidth={1.5} />
              <h3>{s.name}</h3>
              <p>{s.text}</p>
              <span className="loop-arrow" aria-hidden="true">
                ⤳
              </span>
            </motion.a>
          ))}
        </div>
        <p className="hand-note">
          a learning loop, not another leaderboard{" "}
          <span aria-hidden="true">↗</span>
        </p>
      </section>
      <section className="section-wrap classroom-intro">
        <div className="mini-map paper">
          <div className="map-caption">
            <span className="scribble-dot" /> YOUR NEXT 15 MINUTES, MADE CLEAR
          </div>
          <div className="mini-nodes">
            <span className="mini-node">
              Fractions<small>Let’s build a bridge ↗</small>
            </span>
            <span className="mini-node node-blue">
              Ratios<small>Keep exploring ✧</small>
            </span>
            <span className="mini-node">
              Measurement<small>Gather a few more clues</small>
            </span>
          </div>
          <p>
            Illustration of the workflow · explore live synthetic evidence in
            the demo.
          </p>
        </div>
        <div className="classroom-copy">
          <Tag>A teacher’s second pair of eyes</Tag>
          <h2>
            See the idea.
            <br />
            Support the <span className="underlined">learner.</span>
          </h2>
          <p>
            Your Classroom Atlas connects answers to possible misunderstandings.
            Pick a practical bridge, hear the student explain it, then check
            what stays.
          </p>
          <Link className="text-link" to="/demo">
            Take a look inside <MoveUpRight size={20} />
          </Link>
        </div>
      </section>
      <section className="section-wrap closing-note">
        <Star size={30} strokeWidth={1.5} />
        <h2>
          Understanding shouldn’t depend
          <br />
          on the device in your hand.
        </h2>
        <p>
          Paper-friendly activities. Shared-device care. Small, useful offline
          steps.
          <br />
          Built around classrooms, and the people in them.
        </p>
        <Link className="button" to="/demo">
          Find your next aha <ArrowUpRight size={20} />
        </Link>
        <span className="corner-doodle" aria-hidden="true">
          ✧
        </span>
      </section>
    </>
  );
}

const loginSchema = z.object({
  email: z.string().min(3, "Enter your sign-in identifier."),
  password: z.string().min(1, "Enter your password."),
});
export function Login() {
  const { user, refresh } = useApp(),
    nav = useNavigate(),
    [error, setError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });
  if (user)
    return (
      <section className="section-wrap narrow">
        <PageTitle
          eyebrow="YOUR NOTEBOOK IS OPEN"
          title={`Welcome back, ${user.display_name}.`}
        />
        <Link className="button button-yellow" to={"/" + user.role}>
          Go to my workspace <ArrowRight size={18} />
        </Link>
      </section>
    );
  return (
    <section className="section-wrap login-layout">
      <div>
        <p className="eyebrow">A FRESH PAGE. A NEW POSSIBILITY.</p>
        <h1>
          Good to see you.
          <br />
          <span className="blue-word">Let’s make it click.</span>
        </h1>
        <p>Students, teachers, and school stewards sign in here.</p>
        <HeroDoodleIllustration variant="card" />
      </div>
      <form
        className="paper login-form"
        onSubmit={handleSubmit(async (values) => {
          setError(null);
          try {
            await api("/auth/csrf");
            const data = await post("/auth/login", values);
            await refresh();
            nav("/" + data.user.role);
          } catch (e) {
            setError(e);
          }
        })}
      >
        <Tag>Your classroom notebook</Tag>
        <h2>Open your workspace</h2>
        <label>
          Sign-in identifier
          <input
            autoComplete="username"
            {...register("email")}
            placeholder="Your teacher-issued identifier"
          />
        </label>
        {errors.email && <p role="alert">{errors.email.message}</p>}
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
        </label>
        {errors.password && <p role="alert">{errors.password.message}</p>}
        <ErrorBox error={error} />
        <button className="button button-yellow" disabled={isSubmitting}>
          {isSubmitting ? "Opening…" : "Sign in"} <ArrowRight size={19} />
        </button>
        <p className="form-note">
          Classroom accounts are issued by your school. Public sign-up does not
          create teacher or admin access.
        </p>
        <p className="privacy-note">
          Shared device? Sign out when you finish. This wipes locally saved
          lessons, drafts and queued responses.
        </p>
        <Link className="text-link" to="/demo">
          Just exploring? Try the read-only demo.
        </Link>
      </form>
    </section>
  );
}
export function Demo() {
  const query = useQuery({
      queryKey: ["public-demo"],
      queryFn: () => api("/demo/tour"),
    }),
    [selected, setSelected] = useState(() =>
      Math.min(
        4,
        Math.max(
          0,
          Number(new URLSearchParams(location.search).get("step")) || 0,
        ),
      ),
    );
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorBox error={query.error} />;
  const data = query.data;
  return (
    <section className="section-wrap">
      <PageTitle
        eyebrow="THE DEMO NOTEBOOK · ALL DATA IS SYNTHETIC"
        title="A small mistake. A useful clue."
      >
        Explore the real evidence engine. This public tour is read-only; sign in
        to save classroom work.
      </PageTitle>
      {!data.available ? (
        <Empty>
          <h2>A classroom is waiting to be seeded.</h2>
          <p>
            Follow the seed instructions in the project README to load the
            synthetic demonstration.
          </p>
        </Empty>
      ) : (
        <>
          <div
            className="demo-stepper"
            role="tablist"
            aria-label="Learning loop"
          >
            {steps.map((s, i) => (
              <button
                key={s.name}
                role="tab"
                aria-selected={selected === i}
                id={`step-${i}`}
                aria-controls="step-panel"
                onClick={() => setSelected(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next = (i + (e.key === "ArrowRight" ? 1 : 4)) % 5;
                    setSelected(next);
                    document.getElementById("step-" + next)?.focus();
                  }
                }}
                tabIndex={selected === i ? 0 : -1}
                className={selected === i ? "selected" : ""}
              >
                <s.icon size={22} />
                <span>
                  0{i + 1} · {s.name}
                </span>
              </button>
            ))}
          </div>
          <div
            className="paper demo-story"
            role="tabpanel"
            id="step-panel"
            aria-labelledby={`step-${selected}`}
          >
            <div>
              <Tag tone="yellow">One learner’s possible journey</Tag>
              <h2>{data.journey[selected].step}</h2>
              <p>{data.journey[selected].evidence}</p>
              {selected === 0 && (
                <p className="example-question">
                  1/4 + 2/4 = <span className="crossed">3/8</span>{" "}
                  <span className="blue-word">→ 3/4</span>
                  <small>
                    Illustrative response. A wrong answer suggests a
                    possibility, not a diagnosis.
                  </small>
                </p>
              )}
              {selected === 1 && (
                <p>
                  Teacher-reviewed tag: adding denominators. Supporting question
                  IDs and selected choices appear in the concept drawer below
                  when group size permits.
                </p>
              )}
              {selected === 2 && (
                <p>
                  Materials: two paper strips and a pencil. Fold equal parts,
                  combine quarters, explain why the size of a part stays
                  constant.
                </p>
              )}
              {selected === 3 && (
                <p>
                  Rubric: clarity, correctness, example, transfer. Submission by
                  itself never counts as mastery.
                </p>
              )}
              {selected === 4 && (
                <p>
                  A distinct equivalent problem checks transfer. Unanswered
                  checks remain “Not yet assessed”.
                </p>
              )}
            </div>
            <HeroDoodleIllustration variant="card" />
          </div>
          <header className="section-heading">
            <div>
              <p className="eyebrow">{data.classroom}</p>
              <h2>The classroom rescue map</h2>
            </div>
            <p>
              Live aggregate calculations from synthetic persisted responses.
              <br />
              Select a concept to follow the evidence.
            </p>
          </header>
          <AtlasView nodes={data.items as Node[]} publicView />
          <div className="metric-grid">
            <div className="paper metric">
              <strong>{data.insights.questions_attempted}</strong>
              <span>diagnostic responses</span>
            </div>
            <div className="paper metric">
              <strong>{data.insights.teachbacks_reviewed}</strong>
              <span>teacher-reviewed explanations</span>
            </div>
            <div className="paper metric">
              <strong>{percent(data.insights.delayed_accuracy)}</strong>
              <span>delayed accuracy · N={data.insights.delayed_n}</span>
            </div>
          </div>
          <p className="method-note">{data.insights.explanation}</p>
          <Link className="button button-yellow" to="/login">
            Open a live workspace <ArrowRight size={18} />
          </Link>
        </>
      )}
    </section>
  );
}
export function Privacy() {
  return (
    <article className="section-wrap narrow prose">
      <PageTitle
        eyebrow="PRIVACY & CARE"
        title="A classroom is a place of trust."
      />
      <h2>Only what learning needs</h2>
      <p>
        Accounts use school-issued identifiers and may use pseudonyms. We store
        classroom membership, assessment answers, confidence choices, activity
        completion, explanations, optional bounded drawing strokes and teacher
        feedback. We do not ask for precise location, date of birth, biometrics
        or sensitive demographics. No audio or video is uploaded.
      </p>
      <h2>Who can see what?</h2>
      <p>
        Students see their own work. Teachers see only their own classrooms. The
        platform steward sees aggregate health and audit history by default.
        Public demo records are synthetic. Small-group misconception breakouts
        are suppressed below three learners.
      </p>
      <h2>Your shared device</h2>
      <p>
        Explicitly saved lessons, drafts and pending responses live in IndexedDB
        on this device. Anyone using the browser profile may access local
        storage. Save offline work only on a device you trust. Sign out to erase
        it; send pending responses before leaving if you want them saved on the
        server. Offline mode cannot create a session or replace the backend.
      </p>
      <h2>Your school’s decisions</h2>
      <p>
        This is an educational aid, not a diagnostic device. The school must
        obtain appropriate authorization and consent before entering real
        learner data, set a retention period, and provide correction, export and
        deletion support. Ask the school operator to delete your account using
        the documented learner-deletion command. Local copies on your devices
        must also be cleared.
      </p>
      <h2>Transparent learning evidence</h2>
      <p>
        Recommendations follow documented rules and teacher-reviewed activities.
        Confidence never becomes a grade. Completing an activity does not
        establish mastery, and small synthetic samples cannot prove a causal
        effect.
      </p>
      <Link className="text-link" to="/">
        Back to AhaBridge <ArrowRight size={18} />
      </Link>
    </article>
  );
}
export function NotFound() {
  return (
    <section className="section-wrap narrow">
      <PageTitle
        eyebrow="404 · A LITTLE DETOUR"
        title="This page wandered off the notebook."
      />
      <HeroDoodleIllustration variant="empty" />
      <Link className="button" to="/">
        Back to a fresh page <ArrowRight size={18} />
      </Link>
    </section>
  );
}
