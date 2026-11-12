export type User = {
  id: string;
  display_name: string;
  role: "teacher" | "student" | "admin";
  email: string;
  organization_id: string;
};
export type Option = {
  id: string;
  label: string;
  text: string;
  is_correct?: boolean;
  misconception_id?: string;
};
export type Question = {
  id: string;
  concept_id: string;
  stem: string;
  language: string;
  source_type: string;
  options: Option[];
};
export type Classroom = {
  id: string;
  title: string;
  grade_band: string;
  subject: string;
  students?: { id: string; display_name: string }[];
};
export type Bridge = {
  id: string;
  concept_id: string;
  title: string;
  language: string;
  mode: string;
  minutes: number;
  materials: string[];
  steps: string[];
  success_criteria: string[];
  approved_by: string | null;
  version: number;
  misconception_id?: string | null;
};
export type Node = {
  id: string;
  name: string;
  description: string;
  n: number;
  distinct_questions: number;
  learners: number;
  accuracy: number | null;
  confidence_mismatch: number | null;
  status: "insufficient_evidence" | "needs_support" | "enough_evidence";
  priority: number | null;
  priority_inputs: Record<string, number>;
  priority_weights: Record<string, number>;
  suppressed: boolean;
  affected_share: number | null;
  prerequisites: string[];
  activities: Bridge[];
  misconceptions: {
    code: string;
    description: string;
    count: number;
    hint: string;
    evidence: {
      question_id: string;
      selected_option: string;
      option_text: string;
    }[];
  }[];
};
export type Teachback = {
  id: string;
  text_body: string;
  drawing: { x: number; y: number }[][];
  review_state: string;
  feedback: string | null;
  rubric: Record<string, number> | null;
  student_name?: string;
  activity?: string;
  classroom_id?: string;
};
export type Mission = {
  id: string;
  student_id: string;
  classroom_id: string;
  status: string;
  completed_at: string | null;
  echo_due_at: string | null;
  activity: Bridge;
  teachback: Teachback | null;
};
export type Echo = {
  id: string;
  title: string;
  due_at: string;
  due: boolean;
  answered_at: string | null;
  correct: boolean | null;
  question: Question | null;
  status: string;
};
export type Insights = {
  questions_attempted: number;
  concepts_sampled: number;
  concepts_needing_attention: number;
  bridges_assigned: number;
  bridges_completed: number;
  teachbacks_reviewed: number;
  echo_due: number;
  echo_completed: number;
  verified_recoveries: number;
  retained: number;
  delayed_accuracy: number | null;
  delayed_n: number;
  explanation: string;
  as_of: string;
};
export type Diagnostic = {
  id: string;
  title: string;
  classroom_id: string;
  status: string;
  question_count: number;
  attempt_id: string | null;
  completed: boolean;
  questions?: Question[];
};
