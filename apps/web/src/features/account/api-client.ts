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

export type CsvImportError = {
  row: number;
  message: string;
};

export type CsvImportResult = {
  imported: number;
  errors: CsvImportError[];
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

export async function updateGrade(
  id: string,
  input: Partial<{
    subjectId: string;
    termId: string | null;
    title: string;
    gradeValue: number;
    weight: number;
    date: string | null;
    type: GradeType;
    notes: string | null;
  }>,
) {
  return apiRequest<AccountGrade>(`/grades/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteGrade(id: string) {
  return apiRequest<{ deleted: true }>(`/grades/${id}`, {
    method: "DELETE",
  });
}

export async function exportAccountCsv(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/import-export/csv`, {
    credentials: "include",
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  return response.text();
}

export async function importAccountGradesCsv(csv: string): Promise<CsvImportResult> {
  const response = await fetch(`${API_BASE_URL}/import-export/grades/csv`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv }),
  });

  if (!response.ok) {
    const body = await readErrorBody(response);
    const errors = extractCsvImportErrors(body);
    if (errors.length > 0) return { imported: 0, errors };

    throw new ApiError(errorMessageFromBody(body, response.status), response.status);
  }

  return (await response.json()) as CsvImportResult;
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
  const body = await readErrorBody(response);
  return errorMessageFromBody(body, response.status);
}

async function readErrorBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorMessageFromBody(body: unknown, status: number): string {
  if (isRecord(body)) {
    const message = body.message;
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
    if (typeof body.error === "string") return body.error;
  }
  return `Request failed with status ${status}.`;
}

function extractCsvImportErrors(body: unknown): CsvImportError[] {
  if (!isRecord(body) || !Array.isArray(body.errors)) return [];

  return body.errors.filter((error): error is CsvImportError => {
    return isRecord(error) && typeof error.row === "number" && typeof error.message === "string";
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
