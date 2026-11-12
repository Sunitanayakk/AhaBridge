import { useRef } from "react";
type Point = { x: number; y: number };
export function Drawing({
  value,
  onChange,
  readOnly = false,
}: {
  value: Point[][];
  onChange?: (v: Point[][]) => void;
  readOnly?: boolean;
}) {
  const active = useRef(false),
    svg = useRef<SVGSVGElement>(null);
  function point(e: React.PointerEvent) {
    const box = svg.current!.getBoundingClientRect();
    return {
      x: Math.min(600, Math.max(0, ((e.clientX - box.left) / box.width) * 600)),
      y: Math.min(240, Math.max(0, ((e.clientY - box.top) / box.height) * 240)),
    };
  }
  return (
    <div className="drawing-wrap">
      <svg
        ref={svg}
        className={`drawing ${readOnly ? "" : "editable"}`}
        viewBox="0 0 600 240"
        role="img"
        aria-label={
          readOnly
            ? "Learner sketch"
            : "Optional sketch area. A written explanation provides the keyboard-accessible alternative."
        }
        onPointerDown={(e) => {
          if (readOnly || !onChange || value.length >= 100) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          active.current = true;
          onChange([...value, [point(e)]]);
        }}
        onPointerMove={(e) => {
          if (!active.current || !onChange || value.flat().length >= 2400)
            return;
          const copy = value.map((s) => [...s]);
          copy[copy.length - 1].push(point(e));
          onChange(copy);
        }}
        onPointerUp={() => {
          active.current = false;
        }}
        onPointerCancel={() => {
          active.current = false;
        }}
      >
        {value.map((s, i) => (
          <polyline
            key={i}
            points={s.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#2d5da1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      {!readOnly && (
        <button
          type="button"
          className="text-button"
          onClick={() => onChange?.([])}
        >
          Erase sketch
        </button>
      )}
    </div>
  );
}
