export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const csrfToken = () =>
  decodeURIComponent(
    document.cookie
      .split("; ")
      .find((x) => x.startsWith("aha_csrf="))
      ?.split("=")
      .slice(1)
      .join("=") || "",
  );
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
  csrfRetried = false,
): Promise<T> {
  const res = await fetch("/api/v1" + path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.method && options.method !== "GET"
        ? { "X-CSRF-Token": csrfToken() }
        : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (
    res.status === 403 &&
    data.error?.code === "csrf" &&
    !csrfRetried &&
    options.method &&
    options.method !== "GET"
  ) {
    await api("/auth/csrf");
    return api<T>(path, options, true);
  }
  if (!res.ok)
    throw new ApiError(
      res.status,
      data.error?.code || "request_failed",
      data.error?.message || "Request failed. Try again.",
    );
  return data;
}
export const post = <T = any>(path: string, data: unknown = {}) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) });
