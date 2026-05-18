export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubjectType =
  | "regular"
  | "bms_exam_subject"
  | "bms_non_exam_subject"
  | "bms_idpa_idaf"
  | "efz_school_module"
  | "efz_uek_module"
  | "custom";

export type GradeType = "exam" | "quiz" | "project" | "module" | "oral" | "written" | "other";

export type AccountSubject = {
  id: string;
  userId: string;
  name: string;
  shortName: string | null;
  color: string | null;
  subjectType: SubjectType;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AccountTerm = {
  id: string;
  userId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AccountGrade = {
  id: string;
  userId: string;
  subjectId: string;
  termId: string | null;
  title: string;
  gradeValue: string | number;
  weight: string | number;
  date: string | null;
  type: GradeType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  subject: AccountSubject;
  term: AccountTerm | null;
};

export type AccountSnapshot = {
  user: PublicUser;
  subjects: AccountSubject[];
  terms: AccountTerm[];
  grades: AccountGrade[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function registerAccount(input: { email: string; password: string; name?: string }) {
  return apiRequest<{ user: PublicUser }>("/auth/register", {
    method: "POST",
    body: input,
  });
}

export async function loginAccount(input: { email: string; password: string }) {
  return apiRequest<{ user: PublicUser }>("/auth/login", {
    method: "POST",
    body: input,
  });
}

export async function logoutAccount() {
  return apiRequest<{ ok: true }>("/auth/logout", {
    method: "POST",
  });
}

export async function loadAccountSnapshot(): Promise<AccountSnapshot> {
  const [user, subjects, terms, grades] = await Promise.all([
    apiRequest<PublicUser>("/auth/me"),
    apiRequest<AccountSubject[]>("/subjects"),
    apiRequest<AccountTerm[]>("/terms"),
    apiRequest<AccountGrade[]>("/grades"),
  ]);

  return { user, subjects, terms, grades };
}

export async function createSubject(input: {
  name: string;
  shortName?: string;
  color?: string;
  subjectType?: SubjectType;
}) {
  return apiRequest<AccountSubject>("/subjects", {
    method: "POST",
    body: input,
  });
}

export async function updateSubject(
  id: string,
  input: Partial<{
    name: string;
    shortName: string | null;
    color: string | null;
    subjectType: SubjectType;
    archived: boolean;
  }>,
) {
  return apiRequest<AccountSubject>(`/subjects/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteSubject(id: string) {
  return apiRequest<{ deleted: true }>(`/subjects/${id}`, {
    method: "DELETE",
  });
}

export async function createTerm(input: {
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
}) {
  return apiRequest<AccountTerm>("/terms", {
    method: "POST",
    body: input,
  });
}

export async function updateTerm(
  id: string,
  input: Partial<{
    name: string;
    startDate: string | null;
    endDate: string | null;
    isActive: boolean;
  }>,
) {
  return apiRequest<AccountTerm>(`/terms/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteTerm(id: string) {
  return apiRequest<{ deleted: true }>(`/terms/${id}`, {
    method: "DELETE",
  });
}

export async function createGrade(input: {
  subjectId: string;
  termId?: string | null;
  title: string;
  gradeValue: number;
  weight?: number;
  date?: string | null;
  type?: GradeType;
  notes?: string | null;
}) {
  return apiRequest<AccountGrade>("/grades", {
    method: "POST",
    body: input,
  });
}

export async function deleteGrade(id: string) {
  return apiRequest<{ deleted: true }>(`/grades/${id}`, {
    method: "DELETE",
  });
}

async function apiRequest<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const requestInit: RequestInit = {
    method: init.method ?? "GET",
    credentials: "include",
  };

  if (init.body !== undefined) {
    requestInit.headers = { "Content-Type": "application/json" };
    requestInit.body = JSON.stringify(init.body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, requestInit);

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[]; error?: string };
    if (Array.isArray(body.message)) return body.message.join(" ");
    if (body.message) return body.message;
    if (body.error) return body.error;
  } catch {
    return `Request failed with status ${response.status}.`;
  }

  return `Request failed with status ${response.status}.`;
}
