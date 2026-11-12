import { useState, useLayoutEffect, useEffect, useRef, useId } from "react";
import { Link } from "react-router-dom";
import { X, ArrowUpRight, Info } from "lucide-react";
import type { Node } from "../lib/types";
import { Tag, Empty, percent } from "../components/ui";
const statusLabel = {
  needs_support: "Needs support",
  enough_evidence: "Enough evidence",
  insufficient_evidence: "Insufficient evidence",
};
export function AtlasView({
  nodes,
  publicView = false,
}: {
  nodes: Node[];
  publicView?: boolean;
}) {
  const [selected, setSelected] = useState<Node | null>(null);
  const graph = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const [edges, setEdges] = useState<string[]>([]);
  const arrowId = "arrow-" + useId().replace(/[^a-zA-Z0-9]/g, "");
  useLayoutEffect(() => {
    if (!graph.current) return;
    const draw = () => {
      const origin = graph.current!.getBoundingClientRect();
      const paths: string[] = [];
      for (const target of nodes)
        for (const prerequisite of target.prerequisites) {
          const start = buttons.current
            .get(prerequisite)
            ?.getBoundingClientRect();
          const end = buttons.current.get(target.id)?.getBoundingClientRect();
          if (!start || !end) continue;
          const sameRow = Math.abs(start.top - end.top) < 20;
          const x1 =
            (sameRow ? start.right : start.left + start.width / 2) -
            origin.left;
          const y1 =
            (sameRow ? start.top + start.height / 2 : start.bottom) -
            origin.top;
          const x2 =
            (sameRow ? end.left - 5 : end.left + end.width / 2) - origin.left;
          const y2 =
            (sameRow ? end.top + end.height / 2 : end.top - 5) - origin.top;
          paths.push(
            sameRow
              ? `M${x1} ${y1} C${x1 + 18} ${y1 - 9},${x2 - 18} ${y2 + 9},${x2} ${y2}`
              : `M${x1} ${y1} C${x1} ${y1 + 18},${x2} ${y2 - 18},${x2} ${y2}`,
          );
        }
      setEdges(paths);
    };
    draw();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(draw);
    observer?.observe(graph.current);
    window.addEventListener("resize", draw);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [nodes]);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [selected]);
  if (!nodes.length)
    return (
      <Empty>
        <h3>A fresh atlas</h3>
        <p>Create concepts and collect answers to start connecting the dots.</p>
      </Empty>
    );
  return (
    <>
      <div className="atlas-board paper">
        <div className="atlas-legend">
          <span>↗ Needs support</span>
          <span>✓ Enough evidence</span>
          <span>… Collect evidence</span>
        </div>
        <div className="atlas-nodes" ref={graph}>
          <svg className="atlas-connectors" aria-hidden="true">
            <defs>
              <marker
                id={arrowId}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path
                  d="M 1 1 L 9 5 L 1 9"
                  fill="none"
                  stroke="#746a5b"
                  strokeWidth="1.5"
                />
              </marker>
            </defs>
            {edges.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="#746a5b"
                strokeWidth="2"
                markerEnd={`url(#${arrowId})`}
              />
            ))}
          </svg>
          {nodes.map((n, i) => (
            <button
              key={n.id}
              ref={(el) => {
                if (el) buttons.current.set(n.id, el);
                else buttons.current.delete(n.id);
              }}
              className={"atlas-node status-" + n.status}
              onClick={() => setSelected(n)}
              aria-haspopup="dialog"
            >
              <span className="node-index">
                0{i + 1}{" "}
                <span aria-hidden="true">
                  {n.status === "needs_support"
                    ? "↗"
                    : n.status === "enough_evidence"
                      ? "✓"
                      : "…"}
                </span>
              </span>
              <strong>{n.name}</strong>
              <span>{statusLabel[n.status]}</span>
              <small>
                {n.n} responses · {n.distinct_questions} questions
              </small>
            </button>
          ))}
        </div>
        <p className="atlas-note">
          Connections show teacher-authored prerequisites. Accuracy and
          confidence remain separate.
        </p>
        <div className="prereq-list">
          {nodes
            .filter((n) => n.prerequisites.length)
            .map((n) => (
              <span key={n.id}>
                {n.prerequisites
                  .map((p) => nodes.find((x) => x.id === p)?.name)
                  .join(", ")}{" "}
                → {n.name}
              </span>
            ))}
        </div>
      </div>
      <details className="table-fallback">
        <summary>View accessible evidence table</summary>
        <div className="table-scroll">
          <table>
            <caption>Diagnostic evidence by concept</caption>
            <thead>
              <tr>
                <th>Concept</th>
                <th>Status</th>
                <th>Responses</th>
                <th>Accuracy</th>
                <th>Confident & wrong</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((n) => (
                <tr key={n.id}>
                  <th scope="row">
                    <button
                      className="text-button"
                      onClick={() => setSelected(n)}
                    >
                      {n.name}
                    </button>
                  </th>
                  <td>{statusLabel[n.status]}</td>
                  <td>{n.n}</td>
                  <td>{percent(n.accuracy)}</td>
                  <td>{percent(n.confidence_mismatch)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      {selected && (
        <div className="drawer-overlay" onClick={() => setSelected(null)}>
          <section
            className="evidence-drawer paper"
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSelected(null);
              if (e.key === "Tab") {
                const controls = Array.from(
                  e.currentTarget.querySelectorAll<HTMLElement>(
                    "button,a[href],summary",
                  ),
                );
                const first = controls[0],
                  last = controls[controls.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <button
              autoFocus
              className="icon-button drawer-close"
              aria-label="Close evidence"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
            <Tag tone="yellow">Follow the evidence</Tag>
            <h2 id="evidence-title">{selected.name}</h2>
            <p>{selected.description}</p>
            <Tag>{statusLabel[selected.status]}</Tag>
            <dl className="evidence-stats">
              <div>
                <dt>Diagnostic accuracy</dt>
                <dd>{percent(selected.accuracy)}</dd>
              </div>
              <div>
                <dt>High-confidence wrong</dt>
                <dd>{percent(selected.confidence_mismatch)}</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>
                  {selected.n} responses, {selected.distinct_questions} distinct
                  questions
                </dd>
              </div>
            </dl>
            <p className="method-note">
              <Info size={16} /> At least two distinct questions are needed.
              Accuracy below 65% or confidence mismatch ≥40% suggests support.
              These are heuristic demo defaults.
            </p>
            <h3>Possible misunderstandings</h3>
            {selected.suppressed ? (
              <p>
                Small-group details are hidden to protect learners (fewer than
                3).
              </p>
            ) : selected.misconceptions.length ? (
              selected.misconceptions.map((m) => (
                <div className="evidence-item" key={m.code}>
                  <strong>{m.description}</strong>
                  <p>
                    {m.count} tagged selections · possible, never a diagnosis
                  </p>
                  <p>{m.hint}</p>
                  <details>
                    <summary>Supporting answer evidence</summary>
                    {m.evidence.map((e, i) => (
                      <p key={i}>
                        <code>{e.question_id.slice(0, 8)}</code> · option{" "}
                        {e.selected_option}: {e.option_text}
                      </p>
                    ))}
                  </details>
                </div>
              ))
            ) : (
              <p>
                No publishable misconception pattern yet. Breakouts require at
                least three affected learners.
              </p>
            )}
            <h3>Why recommended?</h3>
            {selected.priority === null ? (
              <p>
                Collect more diagnostic evidence before ranking this concept.
              </p>
            ) : (
              <>
                <p>
                  Priority: {selected.priority.toFixed(3)} · teacher-authored
                  prerequisites and observed diagnostic responses.
                </p>
                <ul>
                  {Object.entries(selected.priority_inputs).map(([k, v]) => (
                    <li key={k}>
                      {k.replaceAll("_", " ")}: {v.toFixed(2)} ×{" "}
                      {selected.priority_weights[k].toFixed(2)}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <h3>A practical next step</h3>
            {selected.activities.map((b) => (
              <div className="small-activity" key={b.id}>
                <strong>{b.title}</strong>
                <span>
                  {b.minutes} min · {b.mode.replace("_", " ")}
                </span>
              </div>
            ))}
            {!publicView && (
              <Link
                className="button button-yellow"
                to={`/teacher/bridges?concept=${selected.id}`}
                onClick={() => setSelected(null)}
              >
                Choose a bridge <ArrowUpRight size={18} />
              </Link>
            )}
          </section>
        </div>
      )}
    </>
  );
}
