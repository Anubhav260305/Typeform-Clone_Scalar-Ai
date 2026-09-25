import {
  AnalyticsResponse,
  Form,
  PublicForm,
  Question,
  ResponseDetail,
  ResponseRead,
  ResponseSubmit,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options?.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let errorMessage = `API error (${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((e: { msg?: string }) => e.msg || "").join(", ");
        } else {
          errorMessage = errorData.detail;
        }
      }
    } catch {
      // Body was not json
    }
    throw new ApiError(errorMessage, res.status);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}

// ==================== FORMS API ====================

export async function getForms(): Promise<Form[]> {
  return apiFetch<Form[]>("/api/forms");
}

export async function getForm(id: number): Promise<Form> {
  return apiFetch<Form>(`/api/forms/${id}`);
}

export async function createForm(data: { title: string }): Promise<Form> {
  return apiFetch<Form>("/api/forms", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateForm(
  id: number,
  data: { title?: string; status?: string }
): Promise<Form> {
  return apiFetch<Form>(`/api/forms/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteForm(id: number): Promise<void> {
  return apiFetch<void>(`/api/forms/${id}`, {
    method: "DELETE",
  });
}

export async function publishForm(id: number): Promise<Form> {
  return apiFetch<Form>(`/api/forms/${id}/publish`, {
    method: "POST",
  });
}

export async function unpublishForm(id: number): Promise<Form> {
  return apiFetch<Form>(`/api/forms/${id}/unpublish`, {
    method: "POST",
  });
}

export async function duplicateForm(id: number): Promise<Form> {
  return apiFetch<Form>(`/api/forms/${id}/duplicate`, {
    method: "POST",
  });
}


// ==================== QUESTIONS API ====================

export async function getQuestions(formId: number): Promise<Question[]> {
  return apiFetch<Question[]>(`/api/forms/${formId}/questions`);
}

export async function createQuestion(
  formId: number,
  data: {
    title: string;
    type: string;
    description?: string | null;
    required?: boolean;
    order_index?: number | null;
    settings?: Record<string, unknown> | null;
  }
): Promise<Question> {
  return apiFetch<Question>(`/api/forms/${formId}/questions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getQuestion(questionId: number): Promise<Question> {
  return apiFetch<Question>(`/api/questions/${questionId}`);
}

export async function updateQuestion(
  questionId: number,
  data: {
    title?: string;
    type?: string;
    description?: string | null;
    required?: boolean;
    order_index?: number;
    settings?: Record<string, unknown> | null;
  }
): Promise<Question> {
  return apiFetch<Question>(`/api/questions/${questionId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteQuestion(questionId: number): Promise<void> {
  return apiFetch<void>(`/api/questions/${questionId}`, {
    method: "DELETE",
  });
}

export async function reorderQuestions(
  formId: number,
  questionIds: number[]
): Promise<Question[]> {
  return apiFetch<Question[]>(`/api/forms/${formId}/questions/reorder`, {
    method: "PUT",
    body: JSON.stringify({ question_ids: questionIds }),
  });
}

// ==================== PUBLIC API ====================

export async function getPublicForm(slug: string): Promise<PublicForm> {
  return apiFetch<PublicForm>(`/api/public/forms/${slug}`);
}

// ==================== RESPONSES API ====================

export async function submitResponse(
  formId: number,
  data: ResponseSubmit
): Promise<ResponseDetail> {
  return apiFetch<ResponseDetail>(`/api/forms/${formId}/responses`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getResponses(formId: number): Promise<ResponseRead[]> {
  return apiFetch<ResponseRead[]>(`/api/forms/${formId}/responses`);
}

export async function getResponseCount(formId: number): Promise<{ count: number }> {
  return apiFetch<{ count: number }>(`/api/forms/${formId}/responses/count`);
}

export async function getResponse(responseId: number): Promise<ResponseDetail> {
  return apiFetch<ResponseDetail>(`/api/responses/${responseId}`);
}

export async function deleteResponse(responseId: number): Promise<void> {
  return apiFetch<void>(`/api/responses/${responseId}`, {
    method: "DELETE",
  });
}

// ==================== ANALYTICS API ====================

export async function getAnalytics(formId: number): Promise<AnalyticsResponse> {
  return apiFetch<AnalyticsResponse>(`/api/forms/${formId}/analytics`);
}
