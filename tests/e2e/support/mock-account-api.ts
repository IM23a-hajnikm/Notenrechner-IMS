import type { Page, Route } from "@playwright/test";

type SubjectType =
  | "regular"
  | "bms_exam_subject"
  | "bms_non_exam_subject"
  | "bms_idpa_idaf"
  | "efz_school_module"
  | "efz_uek_module"
  | "custom";

type GradeType = "exam" | "quiz" | "project" | "module" | "oral" | "written" | "other";

type MockUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

type MockSubject = {
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

type MockTerm = {
  id: string;
  userId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type MockGrade = {
  id: string;
  userId: string;
  subjectId: string;
  termId: string | null;
  title: string;
  gradeValue: string;
  weight: string;
  date: string | null;
  type: GradeType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type MockState = {
  user: MockUser;
  subjects: MockSubject[];
  terms: MockTerm[];
  grades: MockGrade[];
  nextId: number;
};

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:3999";
const WEB_ORIGIN = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const NOW = "2026-05-19T00:00:00.000Z";

export async function installMockAccountApi(page: Page): Promise<MockState> {
  const state = createInitialState();

  await page.route(`${API_BASE_URL}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const pathParts = url.pathname.split("/").filter(Boolean);
    const [resource, id] = pathParts;

    if (method === "OPTIONS") {
      await fulfillJson(route, {}, 204);
      return;
    }

    if (resource === "auth") {
      await handleAuth(route, state, pathParts[1], method);
      return;
    }

    if (resource === "subjects") {
      await handleSubjects(route, state, id, method);
      return;
    }

    if (resource === "terms") {
      await handleTerms(route, state, id, method);
      return;
    }

    if (resource === "grades") {
      await handleGrades(route, state, id, method);
      return;
    }

    if (resource === "import-export") {
      await handleImportExport(route, state, pathParts.slice(1), method);
      return;
    }

    await fulfillJson(route, { message: "Not found" }, 404);
  });

  return state;
}

function createInitialState(): MockState {
  const user: MockUser = {
    id: "e2e-user",
    email: "e2e.student@example.test",
    name: "E2E Student",
    createdAt: NOW,
    updatedAt: NOW,
  };

  const subjects: MockSubject[] = [
    subject(user.id, "subject-ma", "Mathematik", "MA", "#1f7a68", "bms_exam_subject"),
    subject(user.id, "subject-de", "Deutsch", "DE", "#2b6cb0", "bms_exam_subject"),
  ];
  const terms: MockTerm[] = [
    {
      id: "term-sem-3",
      userId: user.id,
      name: "3. Semester",
      startDate: "2026-02-01T00:00:00.000Z",
      endDate: "2026-07-10T00:00:00.000Z",
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];
  const grades: MockGrade[] = [
    grade(user.id, "grade-1", "subject-ma", "term-sem-3", "Funktionen", 5, "exam", "2026-03-12"),
    grade(user.id, "grade-2", "subject-de", "term-sem-3", "Essay", 4.5, "project", "2026-03-18"),
  ];

  return { user, subjects, terms, grades, nextId: 100 };
}

async function handleAuth(route: Route, state: MockState, action: string | undefined, method: string) {
  if (action === "me" && method === "GET") {
    await fulfillJson(route, state.user);
    return;
  }

  if ((action === "register" || action === "login") && method === "POST") {
    const body = readBody(route);
    state.user = {
      ...state.user,
      email: typeof body.email === "string" ? body.email : state.user.email,
      name: typeof body.name === "string" ? body.name : state.user.name,
    };
    await fulfillJson(route, { user: state.user });
    return;
  }

  if (action === "logout" && method === "POST") {
    await fulfillJson(route, { ok: true });
    return;
  }

  await fulfillJson(route, { message: "Not found" }, 404);
}

async function handleSubjects(route: Route, state: MockState, id: string | undefined, method: string) {
  if (!id && method === "GET") {
    await fulfillJson(route, state.subjects);
    return;
  }

  if (!id && method === "POST") {
    const body = readBody(route);
    const created = subject(
      state.user.id,
      nextId(state, "subject"),
      stringField(body.name, "E2E Fach"),
      nullableStringField(body.shortName),
      nullableStringField(body.color) ?? "#1f7a68",
      subjectTypeField(body.subjectType),
    );
    state.subjects = [created, ...state.subjects];
    await fulfillJson(route, created, 201);
    return;
  }

  const current = state.subjects.find((entry) => entry.id === id);
  if (!current) {
    await fulfillJson(route, { message: "Subject not found" }, 404);
    return;
  }

  if (method === "PATCH") {
    const body = readBody(route);
    const updated: MockSubject = {
      ...current,
      name: typeof body.name === "string" ? body.name : current.name,
      shortName: body.shortName === null || typeof body.shortName === "string" ? body.shortName : current.shortName,
      color: body.color === null || typeof body.color === "string" ? body.color : current.color,
      subjectType: subjectTypeField(body.subjectType, current.subjectType),
      archived: typeof body.archived === "boolean" ? body.archived : current.archived,
      updatedAt: NOW,
    };
    state.subjects = state.subjects.map((entry) => (entry.id === id ? updated : entry));
    await fulfillJson(route, updated);
    return;
  }

  if (method === "DELETE") {
    state.subjects = state.subjects.filter((entry) => entry.id !== id);
    state.grades = state.grades.filter((entry) => entry.subjectId !== id);
    await fulfillJson(route, { deleted: true });
    return;
  }

  await fulfillJson(route, { message: "Not found" }, 404);
}

async function handleTerms(route: Route, state: MockState, id: string | undefined, method: string) {
  if (!id && method === "GET") {
    await fulfillJson(route, state.terms);
    return;
  }

  if (!id && method === "POST") {
    const body = readBody(route);
    const created: MockTerm = {
      id: nextId(state, "term"),
      userId: state.user.id,
      name: stringField(body.name, "E2E Semester"),
      startDate: dateField(body.startDate),
      endDate: dateField(body.endDate),
      isActive: Boolean(body.isActive),
      createdAt: NOW,
      updatedAt: NOW,
    };
    state.terms = [created, ...state.terms];
    await fulfillJson(route, created, 201);
    return;
  }

  const current = state.terms.find((entry) => entry.id === id);
  if (!current) {
    await fulfillJson(route, { message: "Term not found" }, 404);
    return;
  }

  if (method === "PATCH") {
    const body = readBody(route);
    const updated: MockTerm = {
      ...current,
      name: typeof body.name === "string" ? body.name : current.name,
      startDate:
        body.startDate === null || typeof body.startDate === "string" ? dateField(body.startDate) : current.startDate,
      endDate: body.endDate === null || typeof body.endDate === "string" ? dateField(body.endDate) : current.endDate,
      isActive: typeof body.isActive === "boolean" ? body.isActive : current.isActive,
      updatedAt: NOW,
    };
    state.terms = state.terms.map((entry) => (entry.id === id ? updated : entry));
    await fulfillJson(route, updated);
    return;
  }

  if (method === "DELETE") {
    state.terms = state.terms.filter((entry) => entry.id !== id);
    state.grades = state.grades.map((entry) => (entry.termId === id ? { ...entry, termId: null } : entry));
    await fulfillJson(route, { deleted: true });
    return;
  }

  await fulfillJson(route, { message: "Not found" }, 404);
}

async function handleGrades(route: Route, state: MockState, id: string | undefined, method: string) {
  if (!id && method === "GET") {
    await fulfillJson(
      route,
      state.grades.map((entry) => gradeResponse(state, entry)),
    );
    return;
  }

  if (!id && method === "POST") {
    const body = readBody(route);
    const created = grade(
      state.user.id,
      nextId(state, "grade"),
      stringField(body.subjectId, state.subjects[0]?.id ?? "subject-ma"),
      typeof body.termId === "string" ? body.termId : null,
      stringField(body.title, "E2E Note"),
      numberField(body.gradeValue, 4.5),
      gradeTypeField(body.type),
      typeof body.date === "string" ? body.date : null,
      numberField(body.weight, 1),
      nullableStringField(body.notes),
    );
    state.grades = [created, ...state.grades];
    await fulfillJson(route, gradeResponse(state, created), 201);
    return;
  }

  const current = state.grades.find((entry) => entry.id === id);
  if (!current) {
    await fulfillJson(route, { message: "Grade not found" }, 404);
    return;
  }

  if (method === "PATCH") {
    const body = readBody(route);
    const updated: MockGrade = {
      ...current,
      subjectId: typeof body.subjectId === "string" ? body.subjectId : current.subjectId,
      termId: body.termId === null || typeof body.termId === "string" ? body.termId : current.termId,
      title: typeof body.title === "string" ? body.title : current.title,
      gradeValue:
        body.gradeValue === undefined
          ? current.gradeValue
          : String(numberField(body.gradeValue, Number(current.gradeValue))),
      weight: body.weight === undefined ? current.weight : String(numberField(body.weight, Number(current.weight))),
      date: body.date === null || typeof body.date === "string" ? dateField(body.date) : current.date,
      type: gradeTypeField(body.type, current.type),
      notes: body.notes === null || typeof body.notes === "string" ? body.notes : current.notes,
      updatedAt: NOW,
    };
    state.grades = state.grades.map((entry) => (entry.id === id ? updated : entry));
    await fulfillJson(route, gradeResponse(state, updated));
    return;
  }

  if (method === "DELETE") {
    state.grades = state.grades.filter((entry) => entry.id !== id);
    await fulfillJson(route, { deleted: true });
    return;
  }

  await fulfillJson(route, { message: "Not found" }, 404);
}

async function handleImportExport(route: Route, state: MockState, parts: string[], method: string) {
  if (parts.join("/") === "csv" && method === "GET") {
    const rows = state.grades.map((entry) => {
      const subjectName = state.subjects.find((subjectEntry) => subjectEntry.id === entry.subjectId)?.name ?? "";
      const termName = state.terms.find((termEntry) => termEntry.id === entry.termId)?.name ?? "";
      return [
        subjectName,
        termName,
        entry.title,
        entry.gradeValue,
        entry.weight,
        entry.date ?? "",
        entry.type,
        entry.notes ?? "",
      ].join(",");
    });
    await route.fulfill({
      body: ["subjectName,termName,title,gradeValue,weight,date,type,notes", ...rows].join("\n"),
      contentType: "text/csv",
      headers: corsHeaders(route),
      status: 200,
    });
    return;
  }

  if (parts.join("/") === "grades/csv" && method === "POST") {
    const body = readBody(route);
    const title =
      typeof body.csv === "string"
        ? (body.csv.split(/\r?\n/)[1]?.split(",")[2] ?? "CSV Import Probe")
        : "CSV Import Probe";
    state.grades = [
      grade(
        state.user.id,
        nextId(state, "grade"),
        state.subjects[0].id,
        state.terms[0].id,
        title,
        5,
        "exam",
        "2026-05-01",
      ),
      ...state.grades,
    ];
    await fulfillJson(route, { imported: 1, errors: [] });
    return;
  }

  await fulfillJson(route, { message: "Not found" }, 404);
}

function subject(
  userId: string,
  id: string,
  name: string,
  shortName: string | null,
  color: string | null,
  subjectType: SubjectType,
): MockSubject {
  return { id, userId, name, shortName, color, subjectType, archived: false, createdAt: NOW, updatedAt: NOW };
}

function grade(
  userId: string,
  id: string,
  subjectId: string,
  termId: string | null,
  title: string,
  gradeValue: number,
  type: GradeType,
  date: string | null,
  weight = 1,
  notes: string | null = null,
): MockGrade {
  return {
    id,
    userId,
    subjectId,
    termId,
    title,
    gradeValue: String(gradeValue),
    weight: String(weight),
    date: date ? `${date}T00:00:00.000Z` : null,
    type,
    notes,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function gradeResponse(state: MockState, entry: MockGrade) {
  return {
    ...entry,
    subject: state.subjects.find((subjectEntry) => subjectEntry.id === entry.subjectId) ?? null,
    term: state.terms.find((termEntry) => termEntry.id === entry.termId) ?? null,
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: "application/json",
    headers: corsHeaders(route),
    status,
  });
}

function corsHeaders(route: Route) {
  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Origin": route.request().headers().origin ?? WEB_ORIGIN,
  };
}

function readBody(route: Route): Record<string, unknown> {
  const postData = route.request().postData();
  if (!postData) return {};

  try {
    const parsed = JSON.parse(postData);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function nextId(state: MockState, prefix: string) {
  state.nextId += 1;
  return `${prefix}-${state.nextId}`;
}

function stringField(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function nullableStringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberField(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function dateField(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  return value.includes("T") ? value : `${value}T00:00:00.000Z`;
}

function subjectTypeField(value: unknown, fallback: SubjectType = "regular"): SubjectType {
  const values: SubjectType[] = [
    "regular",
    "bms_exam_subject",
    "bms_non_exam_subject",
    "bms_idpa_idaf",
    "efz_school_module",
    "efz_uek_module",
    "custom",
  ];
  return values.includes(value as SubjectType) ? (value as SubjectType) : fallback;
}

function gradeTypeField(value: unknown, fallback: GradeType = "exam"): GradeType {
  const values: GradeType[] = ["exam", "quiz", "project", "module", "oral", "written", "other"];
  return values.includes(value as GradeType) ? (value as GradeType) : fallback;
}
