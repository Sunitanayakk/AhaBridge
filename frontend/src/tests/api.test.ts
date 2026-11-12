import { afterEach, describe, expect, it, vi } from "vitest";
import { post } from "../lib/api";
afterEach(() => vi.unstubAllGlobals());
describe("session recovery", () => {
  it("refreshes an expired CSRF token once before retrying a blocked mutation", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: "csrf", message: "Expired token" } }),
          { status: 403 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrf_token: "new-token" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ saved: true }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetcher);
    await expect(post("/student/example", { value: "saved" })).resolves.toEqual(
      { saved: true },
    );
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[1][0]).toBe("/api/v1/auth/csrf");
  });
  it("does not silently retry an authorization rejection", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "forbidden", message: "Another classroom" },
          }),
          { status: 403 },
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    await expect(post("/teacher/example", {})).rejects.toThrow(
      "Another classroom",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
