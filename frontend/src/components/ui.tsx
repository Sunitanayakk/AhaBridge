import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApp } from "../app/context";
export function ErrorBox({ error }: { error: unknown }) {
  return error ? (
    <p className="error-note" role="alert">
      {(error as Error).message || "Please try again."}
    </p>
  ) : null;
}
export function Loading() {
  return (
    <div role="status" className="loading paper">
      Sharpening our pencils<span aria-hidden="true"> …</span>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="paper empty">
      <span className="empty-star" aria-hidden="true">
        ✧
      </span>
      {children}
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p className="subheading">{children}</p>}
    </header>
  );
}
export function Tag({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}
export function useAction<T = any, V = void>(
  fn: (args: V) => Promise<T>,
  message = "Saved.",
) {
  const client = useQueryClient(),
    { notify } = useApp();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void client.invalidateQueries();
      notify(message);
    },
  });
}
export const percent = (value: number | null) =>
  value === null ? "Not yet assessed" : Math.round(value * 100) + "%";
export const when = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
