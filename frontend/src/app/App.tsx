import { useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import {
  BookOpen,
  Lightbulb,
  ArrowUpRight,
  Wifi,
  WifiOff,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useApp } from "./context";
import { Loading, ErrorBox } from "../components/ui";
import { Landing, Demo, Login, Privacy, NotFound } from "../pages/Public";
import { Teacher, Planner, Reviews, Impact, PrintPack } from "../pages/Teacher";
import { Author } from "../pages/Author";
import { Student, Exercise, Missions, Echoes } from "../pages/Student";
import { Admin } from "../pages/Admin";

function Guard({ role }: { role: "teacher" | "student" | "admin" }) {
  const { user, loading } = useApp();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role)
    return (
      <div className="paper">
        <h1>Let’s find your classroom.</h1>
        <p>This page is reserved for {role}s.</p>
        <Link className="button" to={"/" + user.role}>
          Open my workspace
        </Link>
      </div>
    );
  return <Outlet />;
}
function Shell() {
  const {
      user,
      online,
      queued,
      language,
      setLanguage,
      t,
      logout,
      notice,
      notify,
      syncNow,
      discard,
    } = useApp(),
    [menu, setMenu] = useState(false),
    [size, setSize] = useState(1),
    [readable, setReadable] = useState(false),
    [loggingOut, setLoggingOut] = useState(false),
    [error, setError] = useState<unknown>(null);
  const nav = useNavigate();
  const links =
    user?.role === "teacher"
      ? [
          [t("atlas"), "/teacher"],
          [t("bridges"), "/teacher/bridges"],
          [t("review"), "/teacher/reviews"],
          [t("impact"), "/teacher/impact"],
        ]
      : user?.role === "student"
        ? [
            [t("diagnostics"), "/student"],
            [t("missions"), "/student/missions"],
            [t("echo"), "/student/echo"],
          ]
        : user?.role === "admin"
          ? [["Platform health", "/admin"]]
          : [
              ["The learning loop", "/#learning-loop"],
              ["Demo classroom", "/demo"],
            ];
  return (
    <div
      className={readable ? "app readable" : "app"}
      style={{ "--text-scale": size } as React.CSSProperties}
    >
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="AhaBridge home">
          <span className="brand-bulb">
            <Lightbulb size={27} />
          </span>
          <span>
            Aha<span className="brand-blue">Bridge</span>
            <small>a little help. a lasting aha.</small>
          </span>
        </Link>
        <button
          className="menu-toggle icon-button"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
        <nav
          aria-label="Main navigation"
          className={menu ? "main-nav is-open" : "main-nav"}
        >
          {links.map(([label, url]) => (
            <NavLink end key={url} to={url} onClick={() => setMenu(false)}>
              {label}
            </NavLink>
          ))}
          {user ? (
            <button
              className="text-button signout"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                try {
                  await logout();
                  nav("/");
                } catch (e) {
                  setError(e);
                } finally {
                  setLoggingOut(false);
                }
              }}
            >
              <LogOut size={17} />
              {t("signout")}
            </button>
          ) : (
            <Link className="button button-small" to="/login">
              Teacher login <ArrowUpRight size={17} />
            </Link>
          )}
        </nav>
      </header>
      <div className="utility-bar">
        <span className="utility-message">
          <BookOpen size={15} />
          {user ? `Your notebook · ${user.display_name}` : t("understand")}
        </span>
        <div className="utilities">
          <span
            className={"connection " + (online ? "" : "is-offline")}
            role="status"
          >
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}{" "}
            {t(online ? "online" : "offline")}
            {queued.length ? ` · ${queued.length} pending` : ""}
          </span>
          <label className="sr-only" htmlFor="language">
            Interface language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as typeof language)}
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="or">ଓଡ଼ିଆ</option>
          </select>
          <button
            className="text-size"
            aria-label="Change text size"
            onClick={() => setSize(size >= 1.2 ? 1 : size + 0.1)}
          >
            A<span>A</span>
          </button>
          <button
            className="readable-toggle"
            aria-pressed={readable}
            onClick={() => setReadable(!readable)}
          >
            Readable
          </button>
        </div>
      </div>
      {language !== "en" && (
        <p className="translation-note">
          Primary navigation translated. Other English text is marked as the
          fallback; Hindi and Odia fraction activities are available in the
          planner. <span lang="en">[English fallback]</span>
        </p>
      )}
      {queued.length > 0 && (
        <details className="sync-panel">
          <summary>
            {queued.length} response{queued.length !== 1 ? "s" : ""} waiting on
            this device {queued.some((q) => q.error) && "· needs attention"}
          </summary>
          <p>
            Reconnect with the same account to send. Shared device? Sign out to
            erase local drafts and queued work.
          </p>
          <button
            className="button button-small"
            disabled={!online}
            onClick={() => void syncNow()}
          >
            Sync now
          </button>
          {queued.map((q) => (
            <div key={q.client_mutation_id} className="queue-item">
              <span>
                {q.kind.replaceAll("_", " ")}: {q.error || "Waiting to send"}
              </span>
              <button
                className="text-button"
                onClick={() => void discard(q.client_mutation_id)}
              >
                Discard
              </button>
            </div>
          ))}
        </details>
      )}
      <ErrorBox error={error} />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <Link to="/" className="footer-brand">
          <Lightbulb size={22} /> AhaBridge
        </Link>
        <p>From “I got it wrong” to “I can teach it right.”</p>
        <div>
          <Link to="/privacy">Privacy & care</Link>
          <Link to="/demo">Synthetic demo</Link>
          <span>
            Made for SDG 4 <span aria-hidden="true">✧</span>
          </span>
        </div>
      </footer>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => notify("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Landing />} />
        <Route path="demo" element={<Demo />} />
        <Route path="login" element={<Login />} />
        <Route path="privacy" element={<Privacy />} />
        <Route element={<Guard role="teacher" />}>
          <Route path="teacher" element={<Teacher />} />
          <Route path="teacher/bridges" element={<Planner />} />
          <Route path="teacher/reviews" element={<Reviews />} />
          <Route path="teacher/impact" element={<Impact />} />
          <Route path="teacher/author" element={<Author />} />
          <Route path="teacher/print/:id" element={<PrintPack />} />
        </Route>
        <Route element={<Guard role="student" />}>
          <Route path="student" element={<Student />} />
          <Route path="student/exercise/:id" element={<Exercise />} />
          <Route path="student/missions" element={<Missions />} />
          <Route path="student/echo" element={<Echoes />} />
        </Route>
        <Route element={<Guard role="admin" />}>
          <Route path="admin" element={<Admin />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
