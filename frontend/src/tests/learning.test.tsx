import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AtlasView } from "../features/Atlas";
import { HeroDoodleIllustration } from "../components/HeroDoodleIllustration";
import { Login } from "../pages/Public";
import { Exercise, Missions, Echoes } from "../pages/Student";
import type { Node } from "../lib/types";

const appState = vi.hoisted(() => ({
  user: null as any,
  online: true,
  demo: false,
  refresh: vi.fn().mockResolvedValue(undefined),
  notify: vi.fn(),
}));
const net = vi.hoisted(() => ({ api: vi.fn(), post: vi.fn() }));
vi.mock("../app/context", () => ({ useApp: () => appState }));
vi.mock("../lib/api", () => net);
vi.mock("../lib/offline", () => ({
  loadDraft: vi.fn().mockResolvedValue(undefined),
  saveDraft: vi.fn().mockResolvedValue(undefined),
  queue: vi.fn(),
  getLesson: vi.fn(),
  saveLesson: vi.fn(),
}));
function wrapper(ui: React.ReactNode, path = "/") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  appState.user = null;
  appState.online = true;
  net.api.mockResolvedValue({ items: [] });
  net.post.mockResolvedValue({});
});
const node: Node = {
  id: "concept-1",
  name: "Fractions",
  description: "Equal parts",
  n: 0,
  distinct_questions: 0,
  learners: 0,
  accuracy: null,
  confidence_mismatch: null,
  status: "insufficient_evidence",
  priority: null,
  priority_inputs: {},
  priority_weights: {},
  suppressed: true,
  affected_share: null,
  prerequisites: [],
  activities: [],
  misconceptions: [],
};
describe("evidence and illustration", () => {
  it("shows empty atlas without fabricating evidence", () => {
    wrapper(<AtlasView nodes={[]} />);
    expect(screen.getByText("A fresh atlas")).toBeInTheDocument();
  });
  it("exposes a keyboard-openable evidence drawer and closes on Escape", () => {
    wrapper(<AtlasView nodes={[node]} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Fractions/ })[0]);
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Collect more diagnostic evidence",
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Small-group details are hidden",
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("imports the supplied PNG with reserved size and an informative hero alternative", () => {
    render(<HeroDoodleIllustration priority />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute(
      "src",
      expect.stringContaining("aha-bulb-original.png"),
    );
    expect(img).toHaveAttribute("width", "2048");
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("alt", expect.stringContaining("ink swirls"));
  });
  it("shows a useful fallback when the image fails", () => {
    render(<HeroDoodleIllustration />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("img")).toHaveTextContent("Artwork unavailable");
  });
});
describe("student and login workflows", () => {
  it("validates login before sending credentials", async () => {
    wrapper(<Login />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Enter your sign-in identifier.");
    expect(net.post).not.toHaveBeenCalled();
  });
  it("logs in with an initial CSRF request and routes to role workspace", async () => {
    net.post.mockResolvedValue({ user: { role: "teacher" } });
    wrapper(
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/teacher" element={<p>Teacher workspace</p>} />
      </Routes>,
    );
    fireEvent.change(screen.getByLabelText("Sign-in identifier"), {
      target: { value: "teacher@test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password-test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Teacher workspace");
    expect(net.api).toHaveBeenCalledWith("/auth/csrf");
    expect(net.post).toHaveBeenCalledWith("/auth/login", {
      email: "teacher@test",
      password: "password-test",
    });
  });
  it("requires both a selected answer and explicit confidence", async () => {
    appState.user = { id: "student" };
    net.api.mockResolvedValue({
      id: "d1",
      title: "Fraction clues",
      questions: [
        {
          id: "q1",
          stem: "What is one quarter plus two quarters?",
          options: [{ id: "o1", label: "A", text: "Three quarters" }],
        },
      ],
    });
    net.post.mockResolvedValue({
      id: "attempt-1",
      answered_question_ids: [],
      completed: false,
    });
    wrapper(
      <Routes>
        <Route path="/exercise/:id" element={<Exercise />} />
      </Routes>,
      "/exercise/d1",
    );
    await screen.findByText("What is one quarter plus two quarters?");
    const button = screen.getByRole("button", { name: "Save & continue" });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByText("Three quarters"));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByLabelText("I’m sure"));
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() =>
      expect(net.post).toHaveBeenCalledWith(
        "/student/diagnostics/attempt-1/answer",
        { question_id: "q1", answer_option_id: "o1", sure: true },
      ),
    );
  });
  it("does not mark unscheduled echoes as failures", async () => {
    appState.user = { id: "student" };
    wrapper(<Echoes />);
    await screen.findByText("Nothing due just yet.");
    expect(screen.queryByText("Failed")).not.toBeInTheDocument();
  });
  it("requires an explanation before submitting a teach-back", async () => {
    appState.user = { id: "student" };
    net.api.mockResolvedValue({
      items: [
        {
          id: "m1",
          completed_at: "2026-11-12T00:00:00Z",
          echo_due_at: "2026-11-15T00:00:00Z",
          teachback: null,
          activity: {
            title: "Paper fractions",
            minutes: 12,
            mode: "hands_on",
            language: "en",
            materials: ["Paper"],
            steps: ["Fold equal parts", "Explain the size"],
            success_criteria: ["Shows equal parts"],
          },
        },
      ],
    });
    wrapper(<Missions />);
    await screen.findByText("Paper fractions");
    const button = screen.getByRole("button", { name: "Send to my teacher" });
    expect(button).toBeDisabled();
    fireEvent.change(
      screen.getByLabelText("Explain the idea in your own words"),
      {
        target: {
          value: "The denominator names equal-sized parts. Here is my example.",
        },
      },
    );
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() =>
      expect(net.post).toHaveBeenCalledWith(
        "/student/teachbacks",
        expect.objectContaining({ bridge_assignment_id: "m1" }),
      ),
    );
  });
});
