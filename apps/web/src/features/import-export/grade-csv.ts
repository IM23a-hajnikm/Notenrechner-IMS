import type { GradeType } from "../account/api-client";

export type CsvSubject = {
  id: string;
  name: string;
  shortName?: string | null;
};

export type CsvTerm = {
  id: string;
  name: string;
};

export type CsvGrade = {
  subjectId: string;
  termId: string | null;
  title: string;
  value: number;
  weight: number;
  date: string | null;
  type: GradeType;
  notes: string | null;
};

export type CsvGradeDraft = CsvGrade;

export type CsvImportError = {
  row: number;
  message: string;
};

export type CsvImportPreview = {
  drafts: CsvGradeDraft[];
  errors: CsvImportError[];
};

const GRADE_TYPES: GradeType[] = ["exam", "quiz", "project", "module", "oral", "written", "other"];
const GRADE_TYPE_VALUES = new Set<string>(GRADE_TYPES);

const GRADE_EXPORT_HEADERS = ["subjectName", "termName", "title", "gradeValue", "weight", "date", "type", "notes"];

export function buildGradeCsv(grades: CsvGrade[], subjects: CsvSubject[], terms: CsvTerm[]): string {
  const rows = [GRADE_EXPORT_HEADERS];

  for (const grade of grades) {
    const subject = subjects.find((item) => item.id === grade.subjectId);
    const term = grade.termId ? terms.find((item) => item.id === grade.termId) : null;
    rows.push([
      subject?.name ?? "",
      term?.name ?? "",
      grade.title,
      formatNumber(grade.value),
      formatNumber(grade.weight),
      grade.date ?? "",
      grade.type,
      grade.notes ?? "",
    ]);
  }

  return `${rows.map(formatCsvRow).join("\r\n")}\r\n`;
}

export function previewGradeCsvImport(csv: string, subjects: CsvSubject[], terms: CsvTerm[]): CsvImportPreview {
  const parsed = parseCsv(csv);
  if (parsed.errors.length > 0) return { drafts: [], errors: parsed.errors };

  const errors: CsvImportError[] = [];
  const drafts: CsvGradeDraft[] = [];

  for (const { row, record } of parsed.rows) {
    const recordType = readField(record, "recordType");
    if (recordType && recordType.toLowerCase() !== "grade") continue;

    const draft = buildGradeDraft(record, row, subjects, terms, errors);
    if (draft) drafts.push(draft);
  }

  if (drafts.length === 0 && errors.length === 0) {
    errors.push({ row: 1, message: "CSV enthaelt keine importierbaren Notenzeilen." });
  }

  return { drafts, errors };
}

export function downloadTextFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildGradeDraft(
  record: Record<string, string>,
  row: number,
  subjects: CsvSubject[],
  terms: CsvTerm[],
  errors: CsvImportError[],
): CsvGradeDraft | null {
  const initialErrorCount = errors.length;
  const subjectId = resolveSubjectId(record, row, subjects, errors);
  const termId = resolveTermId(record, row, terms, errors);
  const title = readField(record, "title", "titel");
  const value = parseNumberField(record, row, errors, {
    field: "gradeValue",
    names: ["gradeValue", "grade", "value", "note"],
    minimum: 1,
    maximum: 6,
    required: true,
  });
  const weight =
    parseNumberField(record, row, errors, {
      field: "weight",
      names: ["weight", "gewicht"],
      minimum: 0,
      required: false,
    }) ?? 1;
  const date = parseDateField(record, row, errors, "date", "datum");
  const typeValue = readField(record, "type", "typ") || "other";
  const type = GRADE_TYPE_VALUES.has(typeValue) ? (typeValue as GradeType) : null;
  const notes = readField(record, "notes", "notizen") || null;

  if (!title) {
    errors.push({ row, message: "Titel ist erforderlich." });
  } else if (title.length > 160) {
    errors.push({ row, message: "Titel darf hoechstens 160 Zeichen lang sein." });
  }

  if (!type) {
    errors.push({ row, message: `Typ muss einer dieser Werte sein: ${GRADE_TYPES.join(", ")}.` });
  }

  if (notes && notes.length > 1_000) {
    errors.push({ row, message: "Notizen duerfen hoechstens 1000 Zeichen lang sein." });
  }

  if (errors.length !== initialErrorCount || !subjectId || value === null || !type) return null;

  return {
    subjectId,
    termId,
    title,
    value,
    weight,
    date,
    type,
    notes,
  };
}

function resolveSubjectId(
  record: Record<string, string>,
  row: number,
  subjects: CsvSubject[],
  errors: CsvImportError[],
) {
  const subjectId = readField(record, "subjectId");
  const subjectName = readField(record, "subjectName", "subject", "fach");

  if (subjectId) {
    const subject = subjects.find((candidate) => candidate.id === subjectId);
    if (subject) return subject.id;
    errors.push({ row, message: "subjectId gehoert nicht zu einem vorhandenen Fach." });
    return null;
  }

  if (!subjectName) {
    errors.push({ row, message: "subjectId oder subjectName ist erforderlich." });
    return null;
  }

  const matches = subjects.filter((subject) => matchesNameOrShortName(subject, subjectName));
  if (matches.length === 1) return matches[0]?.id ?? null;

  errors.push({
    row,
    message:
      matches.length === 0
        ? "subjectName passt zu keinem vorhandenen Fach."
        : "subjectName ist mehrdeutig; verwende subjectId.",
  });
  return null;
}

function resolveTermId(record: Record<string, string>, row: number, terms: CsvTerm[], errors: CsvImportError[]) {
  const termId = readField(record, "termId");
  const termName = readField(record, "termName", "term", "semester");

  if (termId) {
    const term = terms.find((candidate) => candidate.id === termId);
    if (term) return term.id;
    errors.push({ row, message: "termId gehoert nicht zu einem vorhandenen Semester." });
    return null;
  }

  if (!termName) return null;

  const matches = terms.filter((term) => term.name.toLowerCase() === termName.toLowerCase());
  if (matches.length === 1) return matches[0]?.id ?? null;

  errors.push({
    row,
    message:
      matches.length === 0
        ? "termName passt zu keinem vorhandenen Semester."
        : "termName ist mehrdeutig; verwende termId.",
  });
  return null;
}

function matchesNameOrShortName(subject: CsvSubject, value: string): boolean {
  const normalizedValue = value.toLowerCase();
  return subject.name.toLowerCase() === normalizedValue || subject.shortName?.toLowerCase() === normalizedValue;
}

function parseNumberField(
  record: Record<string, string>,
  row: number,
  errors: CsvImportError[],
  options: { field: string; names: string[]; minimum?: number; maximum?: number; required: boolean },
): number | null {
  const rawValue = readField(record, ...options.names);
  if (!rawValue) {
    if (options.required) errors.push({ row, message: `${options.field} ist erforderlich.` });
    return null;
  }

  const value = Number(rawValue.replace(",", "."));
  if (!Number.isFinite(value)) {
    errors.push({ row, message: `${options.field} muss eine Zahl sein.` });
    return null;
  }

  if (options.minimum !== undefined && value < options.minimum) {
    errors.push({ row, message: `${options.field} muss mindestens ${options.minimum} sein.` });
  }

  if (options.maximum !== undefined && value > options.maximum) {
    errors.push({ row, message: `${options.field} darf hoechstens ${options.maximum} sein.` });
  }

  return value;
}

function parseDateField(record: Record<string, string>, row: number, errors: CsvImportError[], ...names: string[]) {
  const rawValue = readField(record, ...names);
  if (!rawValue) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    errors.push({ row, message: "Datum muss im Format JJJJ-MM-TT sein." });
    return null;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== rawValue) {
    errors.push({ row, message: "Datum muss ein echtes Kalenderdatum sein." });
    return null;
  }

  return rawValue;
}

function parseCsv(csv: string): { rows: { row: number; record: Record<string, string> }[]; errors: CsvImportError[] } {
  const errors: CsvImportError[] = [];
  const records = parseCsvRecords(csv.replace(/^\uFEFF/, ""), errors);

  if (records.length === 0 || records.every((record) => record.every((field) => !field.trim()))) {
    return { rows: [], errors: [{ row: 1, message: "CSV ist leer." }] };
  }

  const headers = records[0]?.map((header) => normalizeHeader(header)) ?? [];
  if (headers.length === 0 || headers.every((header) => !header)) {
    return { rows: [], errors: [{ row: 1, message: "CSV braucht eine Kopfzeile." }] };
  }

  const seenHeaders = new Set<string>();
  for (const header of headers) {
    if (!header) continue;
    if (seenHeaders.has(header)) {
      errors.push({ row: 1, message: `Doppelte Spalte "${header}".` });
    }
    seenHeaders.add(header);
  }

  const rows = records
    .slice(1)
    .map((values, index) => ({ row: index + 2, values }))
    .filter(({ values }) => values.some((value) => value.trim()))
    .map(({ row, values }) => {
      if (values.length > headers.length) {
        errors.push({ row, message: "Zeile hat mehr Werte als die Kopfzeile." });
      }

      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (!header) return;
        record[header] = values[index]?.trim() ?? "";
      });
      return { row, record };
    });

  return { rows, errors };
}

function parseCsvRecords(csv: string, errors: CsvImportError[]): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let rowNumber = 1;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];

    if (inQuotes) {
      if (char === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      if (field.length === 0) inQuotes = true;
      else field += char;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
      rowNumber += 1;
    } else if (char === "\r") {
      if (csv[index + 1] === "\n") continue;
      row.push(field);
      records.push(row);
      row = [];
      field = "";
      rowNumber += 1;
    } else {
      field += char;
    }
  }

  if (inQuotes) errors.push({ row: rowNumber, message: "CSV-Anfuehrungszeichen wurden nicht geschlossen." });

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  return records;
}

function readField(record: Record<string, string>, ...names: string[]): string {
  for (const name of names) {
    const value = record[normalizeHeader(name)];
    if (value !== undefined) return value.trim();
  }
  return "";
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function formatCsvRow(row: string[]): string {
  return row.map(escapeCsvField).join(",");
}

function escapeCsvField(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function formatNumber(value: number): string {
  return Number(value).toString();
}
