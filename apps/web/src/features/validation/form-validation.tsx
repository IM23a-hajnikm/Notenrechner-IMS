import { z } from "zod";

const SUBJECT_TYPES = [
  "regular",
  "bms_exam_subject",
  "bms_non_exam_subject",
  "bms_idpa_idaf",
  "efz_school_module",
  "efz_uek_module",
  "custom",
] as const;

const GRADE_TYPES = ["exam", "quiz", "project", "module", "oral", "written", "other"] as const;

const optionalDateInput = z
  .string()
  .trim()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Datum muss im Format JJJJ-MM-TT sein.")
  .transform((value) => value || null);

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export const authLoginSchema = z.object({
  email: z.string().trim().email("Bitte gib eine gueltige E-Mail-Adresse ein."),
  password: z
    .string()
    .min(8, "Passwort muss mindestens 8 Zeichen lang sein.")
    .max(128, "Passwort darf hoechstens 128 Zeichen lang sein."),
});

export const authRegisterSchema = authLoginSchema.extend({
  name: z
    .string()
    .trim()
    .max(80, "Name darf hoechstens 80 Zeichen lang sein.")
    .transform((value) => value || undefined),
});

export const subjectFormSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich.").max(120, "Name darf hoechstens 120 Zeichen lang sein."),
  shortName: z
    .string()
    .trim()
    .max(12, "Kurzname darf hoechstens 12 Zeichen lang sein.")
    .transform((value) => value || null),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Farbe muss ein Hex-Code wie #1f7a68 sein.")
    .transform((value) => value || null),
  subjectType: z.enum(SUBJECT_TYPES),
  archived: z.boolean().optional().default(false),
});

export const termFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name ist erforderlich.").max(120, "Name darf hoechstens 120 Zeichen lang sein."),
    startDate: optionalDateInput,
    endDate: optionalDateInput,
    isActive: z.boolean().optional().default(false),
  })
  .superRefine((value, context) => {
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ende darf nicht vor dem Start liegen.",
        path: ["endDate"],
      });
    }
  });

export const gradeFormSchema = z.object({
  subjectId: z.string().min(1, "Erstelle oder waehle zuerst ein Fach."),
  termId: z.string().transform((value) => value || null),
  title: z.string().trim().min(1, "Titel ist erforderlich.").max(160, "Titel darf hoechstens 160 Zeichen lang sein."),
  gradeValue: z.coerce
    .number({ invalid_type_error: "Note muss eine gueltige Zahl sein." })
    .min(1, "Note muss mindestens 1.0 sein.")
    .max(6, "Note darf hoechstens 6.0 sein."),
  weight: z.coerce
    .number({ invalid_type_error: "Gewicht muss eine gueltige Zahl sein." })
    .min(0, "Gewicht darf nicht negativ sein."),
  date: optionalDateInput,
  type: z.enum(GRADE_TYPES),
  notes: z
    .string()
    .trim()
    .max(1000, "Notizen duerfen hoechstens 1000 Zeichen lang sein.")
    .transform((value) => value || null),
});

export function fieldErrorsFromZod<T extends string>(error: z.ZodError): FieldErrors<T> {
  const errors: FieldErrors<T> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || errors[field as T]) continue;
    errors[field as T] = issue.message;
  }

  return errors;
}

export function fieldErrorId(formId: string, field: string): string {
  return `${formId}-${field}-error`;
}

export function inputClassName(hasError: boolean, extra = ""): string {
  return ["rounded-md border px-3 py-2", hasError ? "border-red-300 bg-red-50" : "border-black/15", extra]
    .filter(Boolean)
    .join(" ");
}

export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return message ? (
    <span id={id} className="text-xs font-normal leading-5 text-red-700">
      {message}
    </span>
  ) : null;
}
