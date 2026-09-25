export type FormStatus = "draft" | "published";

export interface Form {
  id: number;
  title: string;
  slug: string;
  status: FormStatus;
  created_at: string;
  updated_at: string;
  response_count: number;
}

export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export interface QuestionSettings {
  options?: string[];
  min_rating?: number;
  max_rating?: number;
  min?: number;
  max?: number;
  [key: string]: unknown;
}

export interface Question {
  id: number;
  form_id: number;
  type: QuestionType;
  title: string;
  description: string | null;
  required: boolean;
  order_index: number;
  settings: QuestionSettings | null;
  created_at: string;
  updated_at: string;
}

export interface PublicQuestion {
  id: number;
  type: QuestionType;
  title: string;
  description: string | null;
  required: boolean;
  order_index: number;
  settings: QuestionSettings | null;
}

export interface PublicForm {
  id: number;
  title: string;
  slug: string;
  questions: PublicQuestion[];
}

export interface AnswerSubmit {
  question_id: number;
  value: unknown;
}

export interface ResponseSubmit {
  answers: AnswerSubmit[];
}

export interface AnswerDetail {
  id: number;
  question_id: number;
  question_title: string;
  question_type: QuestionType;
  value: unknown;
}

export interface ResponseDetail {
  id: number;
  form_id: number;
  submitted_at: string;
  created_at: string;
  answers: AnswerDetail[];
}

export interface ResponseRead {
  id: number;
  form_id: number;
  submitted_at: string;
  created_at: string;
}

export interface AnalyticsQuestion {
  question_id: number;
  question_title: string;
  question_type: QuestionType;
  response_count: number;
  average?: number | null;
  minimum?: number | null;
  maximum?: number | null;
  distribution?: Record<string, number> | null;
}

export interface AnalyticsResponse {
  form_id: number;
  total_responses: number;
  questions: AnalyticsQuestion[];
}
