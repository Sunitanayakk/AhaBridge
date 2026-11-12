import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import bulb from "../assets/illustrations/aha-bulb-original.png";
export function HeroDoodleIllustration({
  variant = "hero",
  className = "",
  priority = false,
}: {
  variant?: "hero" | "card" | "empty";
  className?: string;
  priority?: boolean;
}) {
  const reduced = useReducedMotion(),
    [failed, setFailed] = useState(false);
  return (
    <motion.figure
      className={`hero-art art-${variant} ${className}`}
      initial={reduced ? false : { opacity: 0, y: 8, rotate: 1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.65 }}
    >
      <span className="tape tape-one" aria-hidden="true" />
      <span className="tape tape-two" aria-hidden="true" />
      {failed ? (
        <div
          className="art-fallback"
          role="img"
          aria-label="Original notebook lightbulb artwork could not load"
        >
          ✧ A little spark of understanding.{" "}
          <small>Artwork unavailable. Please refresh.</small>
        </div>
      ) : (
        <img
          src={bulb}
          width="2048"
          height="1655"
          sizes={variant === "hero" ? "(max-width: 768px) 92vw, 48vw" : "240px"}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onError={() => setFailed(true)}
          alt={
            variant === "hero"
              ? "Yellow hand-drawn lightbulb with intricate ink swirls and blue and orange stars on ruled notebook paper"
              : ""
          }
          aria-hidden={variant !== "hero"}
        />
      )}
      {variant === "hero" && (
        <figcaption>
          big ideas start with a little “aha!”{" "}
          <span aria-hidden="true">↗</span>
        </figcaption>
      )}
    </motion.figure>
  );
}
