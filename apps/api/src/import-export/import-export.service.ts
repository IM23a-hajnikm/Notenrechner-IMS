import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { GradeType } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

const EXPORT_HEADERS = [
  "recordType",
  "id",
  "name",
  "shortName",
  "color",
  "subjectType",
  "archived",
  "startDate",
  "endDate",
  "isActive",
  "subjectId",
  "subjectName",
  "termId",
  "termName",
  "title",
  "gradeValue",
  "weight",
  "date",
  "type",
  "notes",
] as const;

const GRADE_TYPES: readonly GradeType[] = ["exam", "quiz", "project", "module", "oral", "written", "other"];
const GRADE_TYPE_VALUES = new Set<string>(GRADE_TYPES);
const MAX_IMPORT_ROWS = 2_000;

type CsvRecord = Record<string, string>;
type ImportError = { row: number; message: string };
type GradeImportDraft = {
  subjectId: string;
  termId: string | null;
  title: string;
  gradeValue: number;
  weight: number;
  date: Date | null;
  type: GradeType;
  notes: string | null;
};

type OwnedSubject = {
  id: string;
  name: string;
  shortName: string | null;
};

type OwnedTerm = {
  id: string;
  name: string;
};

@Injectable()
export class ImportExportService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async exportCsv(userId: string): Promise<string> {
    const [subjects, terms, grades] = await Promise.all([
      this.prisma.subject.findMany({ where: { userId } }),
      this.prisma.term.findMany({ where: { userId } }),
      this.prisma.grade.findMany({
        where: { userId },
        include: {
          subject: true,
          term: true,
        },
      }),
    ]);

    const rows: string[][] = [Array.from(EXPORT_HEADERS)];

    for (const subject of subjects) {
      rows.push(
        rowFromObject({
          recordType: "subject",
          id: subject.id,
          name: subject.name,
          shortName: subject.shortName,
          color: subject.color,
          subjectType: subject.subjectType,
          archived: String(subject.archived),
        }),
      );
    }

    for (const term of terms) {
      rows.push(
        rowFromObject({
          recordType: "term",
          id: term.id,
          name: term.name,
          startDate: formatDate(term.startDate),
          endDate: formatDate(term.endDate),
          isActive: String(term.isActive),
        }),
      );
    }

    for (const grade of grades) {
      rows.push(
        rowFromObject({
          recordType: "grade",
          id: grade.id,
          subjectId: grade.subjectId,
          subjectName: grade.subject?.name,
          termId: grade.termId,
          termName: grade.term?.name,
          title: grade.title,
          gradeValue: formatNumber(grade.gradeValue),
          weight: formatNumber(grade.weight),
          date: formatDate(grade.date),
          type: grade.type,
          notes: grade.notes,
        }),
      );
    }

    return `${rows.map(formatCsvRow).join("\r\n")}\r\n`;
  }

  async importGrades(userId: string, csv: string): Promise<{ imported: number; errors: ImportError[] }> {
    const parsed = parseCsv(csv);
    if (parsed.errors.length > 0) throwImportErrors(parsed.errors);

    const gradeRows = parsed.rows.filter(({ record }) => {
      const recordType = readField(record, "recordType");
      return !recordType || recordType.toLowerCase() === "grade";
    });

    if (gradeRows.length > MAX_IMPORT_ROWS) {
      throwImportErrors([{ row: 1, message: `CSV import is limited to ${MAX_IMPORT_ROWS} grade rows.` }]);
    }

    const [subjects, terms] = await Promise.all([
      this.prisma.subject.findMany({ where: { userId } }),
      this.prisma.term.findMany({ where: { userId } }),
    ]);

    const errors: ImportError[] = [];
    const drafts: GradeImportDraft[] = [];

    for (const { row, record } of gradeRows) {
      const draft = buildGradeDraft(record, row, subjects, terms, errors);
      if (draft) drafts.push(draft);
    }

    if (errors.length > 0) throwImportErrors(errors);

    for (const draft of drafts) {
      await this.prisma.grade.create({
        data: {
          userId,
          ...draft,
        },
        include: {
          subject: true,
          term: true,
        },
      });
    }

    return { imported: drafts.length, errors: [] };
  }
}

function buildGradeDraft(
  record: CsvRecord,
  row: number,
  subjects: OwnedSubject[],
  terms: OwnedTerm[],
  errors: ImportError[],
): GradeImportDraft | null {
  const initialErrorCount = errors.length;
  const subjectId = resolveSubjectId(record, row, subjects, errors);
  const termId = resolveTermId(record, row, terms, errors);
  const title = readField(record, "title", "titel");
  const gradeValue = parseNumberField(record, row, errors, {
    field: "grade value",
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
  const type = isGradeType(typeValue) ? typeValue : null;
  const notes = readField(record, "notes", "notizen") || null;

  if (!title) {
    errors.push({ row, message: "Title is required." });
  } else if (title.length > 160) {
    errors.push({ row, message: "Title must be 160 characters or fewer." });
  }

  if (!type) {
    errors.push({ row, message: `Grade type must be one of: ${GRADE_TYPES.join(", ")}.` });
  }

  if (notes && notes.length > 1_000) {
    errors.push({ row, message: "Notes must be 1000 characters or fewer." });
  }

  if (errors.length !== initialErrorCount || !subjectId || gradeValue === null || !type) return null;

  return {
    subjectId,
    termId,
    title,
    gradeValue,
    weight,
    date,
    type,
    notes,
  };
}

function resolveSubjectId(record: CsvRecord, row: number, subjects: OwnedSubject[], errors: ImportError[]) {
  const subjectId = readField(record, "subjectId");
  const subjectName = readField(record, "subjectName", "subject", "fach");

  if (subjectId) {
    const subject = subjects.find((candidate) => candidate.id === subjectId);
    if (!subject) {
      errors.push({ row, message: "subjectId does not belong to the current user." });
      return null;
    }
    return subject.id;
  }

  if (!subjectName) {
    errors.push({ row, message: "subjectId or subjectName is required." });
    return null;
  }

  const matches = subjects.filter((subject) => matchesNameOrShortName(subject, subjectName));
  if (matches.length === 1) return matches[0]?.id ?? null;

  errors.push({
    row,
    message: matches.length === 0 ? "subjectName does not match an owned subject." : "subjectName is ambiguous.",
  });
  return null;
}

function resolveTermId(record: CsvRecord, row: number, terms: OwnedTerm[], errors: ImportError[]) {
  const termId = readField(record, "termId");
  const termName = readField(record, "termName", "term", "semester");

  if (termId) {
    const term = terms.find((candidate) => candidate.id === termId);
    if (!term) {
      errors.push({ row, message: "termId does not belong to the current user." });
      return null;
    }
    return term.id;
  }

  if (!termName) return null;

  const matches = terms.filter((term) => term.name.toLowerCase() === termName.toLowerCase());
  if (matches.length === 1) return matches[0]?.id ?? null;

  errors.push({
    row,
    message: matches.length === 0 ? "termName does not match an owned term." : "termName is ambiguous.",
  });
  return null;
}

function matchesNameOrShortName(subject: OwnedSubject, value: string): boolean {
  const normalizedValue = value.toLowerCase();
  return subject.name.toLowerCase() === normalizedValue || subject.shortName?.toLowerCase() === normalizedValue;
}

function isGradeType(value: string): value is GradeType {
  return GRADE_TYPE_VALUES.has(value);
}

function parseNumberField(
  record: CsvRecord,
  row: number,
  errors: ImportError[],
  options: { field: string; names: string[]; minimum?: number; maximum?: number; required: boolean },
): number | null {
  const rawValue = readField(record, ...options.names);
  if (!rawValue) {
    if (options.required) errors.push({ row, message: `${options.field} is required.` });
    return null;
  }

  const value = Number(rawValue.replace(",", "."));
  if (!Number.isFinite(value)) {
    errors.push({ row, message: `${options.field} must be a number.` });
    return null;
  }

  if (options.minimum !== undefined && value < options.minimum) {
    errors.push({ row, message: `${options.field} must be at least ${options.minimum}.` });
  }

  if (options.maximum !== undefined && value > options.maximum) {
    errors.push({ row, message: `${options.field} must be at most ${options.maximum}.` });
  }

  return value;
}

function parseDateField(record: CsvRecord, row: number, errors: ImportError[], ...names: string[]): Date | null {
  const rawValue = readField(record, ...names);
  if (!rawValue) return null;

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    errors.push({ row, message: "date must be a valid ISO date." });
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue) && date.toISOString().slice(0, 10) !== rawValue) {
    errors.push({ row, message: "date must be a real calendar date." });
    return null;
  }

  return date;
}

function parseCsv(csv: string): { rows: { row: number; record: CsvRecord }[]; errors: ImportError[] } {
  const errors: ImportError[] = [];
  const records = parseCsvRecords(csv.replace(/^\uFEFF/, ""), errors);

  if (records.length === 0 || records.every((record) => record.every((field) => !field.trim()))) {
    return { rows: [], errors: [{ row: 1, message: "CSV is empty." }] };
  }

  const headers = records[0]?.map((header) => normalizeHeader(header)) ?? [];
  if (headers.length === 0 || headers.every((header) => !header)) {
    return { rows: [], errors: [{ row: 1, message: "CSV header row is required." }] };
  }

  const seenHeaders = new Set<string>();
  for (const header of headers) {
    if (!header) continue;
    if (seenHeaders.has(header)) {
      errors.push({ row: 1, message: `Duplicate header "${header}".` });
    }
    seenHeaders.add(header);
  }

  const rows = records
    .slice(1)
    .map((values, index) => ({ row: index + 2, values }))
    .filter(({ values }) => values.some((value) => value.trim()))
    .map(({ row, values }) => {
      if (values.length > headers.length) {
        errors.push({ row, message: "Row has more values than the header row." });
      }

      const record: CsvRecord = {};
      headers.forEach((header, index) => {
        if (!header) return;
        record[header] = values[index]?.trim() ?? "";
      });
      return { row, record };
    });

  return { rows, errors };
}

function parseCsvRecords(csv: string, errors: ImportError[]): string[][] {
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
      if (field.length === 0) {
        inQuotes = true;
      } else {
        field += char;
      }
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

  if (inQuotes) {
    errors.push({ row: rowNumber, message: "Quoted CSV field is not closed." });
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  return records;
}

function readField(record: CsvRecord, ...names: string[]): string {
  for (const name of names) {
    const value = record[normalizeHeader(name)];
    if (value !== undefined) return value.trim();
  }
  return "";
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function rowFromObject(values: Partial<Record<(typeof EXPORT_HEADERS)[number], unknown>>): string[] {
  return EXPORT_HEADERS.map((header) => valueToCsvField(values[header]));
}

function valueToCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function formatCsvRow(row: string[]): string {
  return row.map(escapeCsvField).join(",");
}

function escapeCsvField(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function formatNumber(value: unknown): string {
  return Number(value).toString();
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function throwImportErrors(errors: ImportError[]): never {
  throw new BadRequestException({
    message: "CSV import failed.",
    errors,
  });
}
