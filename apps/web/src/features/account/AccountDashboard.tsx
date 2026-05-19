"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { calculateSemesterGrade, calculateWeightedAverage } from "@notenrechner/shared";

import {
  AccountGrade,
  AccountSnapshot,
  AccountSubject,
  AccountTerm,
  CsvImportResult,
  GradeType,
  SubjectType,
  createGrade,
  createSubject,
  createTerm,
  deleteGrade,
  deleteSubject,
  deleteTerm,
  exportAccountCsv,
  importAccountGradesCsv,
  loadAccountSnapshot,
  logoutAccount,
  updateGrade,
  updateSubject,
  updateTerm,
} from "./api-client";
import { ContextualRequiredGradePlanner } from "../calculators/ContextualRequiredGradePlanner";
import { CertificationInputGuide, CertificationStatusCards } from "../certification/CertificationStatusCards";
import { deriveSavedCertificationStatus } from "../certification/saved-data-status";
import { CsvImportExportPanel } from "../import-export/CsvImportExportPanel";
import {
  FieldError,
  FieldErrors,
  fieldErrorId,
  fieldErrorsFromZod,
  gradeFormSchema,
  inputClassName,
  subjectFormSchema,
  termFormSchema,
} from "../validation/form-validation";

const DEFAULT_SUBJECT_COLOR = "#1f7a68";

const SUBJECT_TYPES: { value: SubjectType; label: string }[] = [
  { value: "regular", label: "Regulaer" },
  { value: "bms_exam_subject", label: "BMS Pruefungsfach" },
  { value: "bms_non_exam_subject", label: "BMS Erfahrungsfach" },
  { value: "bms_idpa_idaf", label: "IDPA / IDAF" },
  { value: "efz_school_module", label: "EFZ Schule" },
  { value: "efz_uek_module", label: "EFZ UeK" },
  { value: "custom", label: "Custom" },
];

const GRADE_TYPES: { value: GradeType; label: string }[] = [
  { value: "exam", label: "Pruefung" },
  { value: "quiz", label: "Kurztest" },
  { value: "project", label: "Projekt" },
  { value: "module", label: "Modul" },
  { value: "oral", label: "Muendlich" },
  { value: "written", label: "Schriftlich" },
  { value: "other", label: "Andere" },
];

type AccountView = "dashboard" | "subjects" | "terms" | "grades";
type CreateSubjectInput = Parameters<typeof createSubject>[0];
type CreateTermInput = Parameters<typeof createTerm>[0];
type CreateGradeInput = Parameters<typeof createGrade>[0];
type UpdateSubjectInput = Parameters<typeof updateSubject>[1];
type UpdateTermInput = Parameters<typeof updateTerm>[1];
type UpdateGradeInput = Parameters<typeof updateGrade>[1];

type SubjectFormInput = {
  name: string;
  shortName: string | null;
  color: string | null;
  subjectType: SubjectType;
  archived: boolean;
};

type TermFormInput = {
  name: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
};

type GradeFormInput = {
  subjectId: string;
  termId: string | null;
  title: string;
  gradeValue: number;
  weight: number;
  date: string | null;
  type: GradeType;
  notes: string | null;
};

type SubjectFormField = "name" | "shortName" | "color" | "subjectType" | "archived";
type TermFormField = "name" | "startDate" | "endDate" | "isActive";
type GradeFormField = "subjectId" | "termId" | "title" | "gradeValue" | "weight" | "date" | "type" | "notes";

type GradeSort =
  | "date-desc"
  | "date-asc"
  | "grade-desc"
  | "grade-asc"
  | "subject-asc"
  | "subject-desc"
  | "term-asc"
  | "term-desc"
  | "weight-desc"
  | "weight-asc";

type GradeFilters = {
  search: string;
  subjectId: string;
  termId: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  belowFourOnly: boolean;
  sort: GradeSort;
};

const ACCOUNT_VIEWS: { value: AccountView; label: string; description: string }[] = [
  { value: "dashboard", label: "Dashboard", description: "Ueberblick" },
  { value: "subjects", label: "Faecher", description: "Struktur" },
  { value: "terms", label: "Semester", description: "Zeitraeume" },
  { value: "grades", label: "Noten", description: "Erfassung" },
];

const NO_TERM_FILTER = "__none";

const DEFAULT_GRADE_FILTERS: GradeFilters = {
  search: "",
  subjectId: "",
  termId: "",
  type: "",
  dateFrom: "",
  dateTo: "",
  belowFourOnly: false,
  sort: "date-desc",
};

const GRADE_SORTS: { value: GradeSort; label: string }[] = [
  { value: "date-desc", label: "Datum neu zuerst" },
  { value: "date-asc", label: "Datum alt zuerst" },
  { value: "grade-desc", label: "Note hoch zuerst" },
  { value: "grade-asc", label: "Note tief zuerst" },
  { value: "subject-asc", label: "Fach A-Z" },
  { value: "subject-desc", label: "Fach Z-A" },
  { value: "term-asc", label: "Semester A-Z" },
  { value: "term-desc", label: "Semester Z-A" },
  { value: "weight-desc", label: "Gewicht hoch zuerst" },
  { value: "weight-asc", label: "Gewicht tief zuerst" },
];

export function AccountDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = parseAccountView(searchParams.get("view"));
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const data = await loadAccountSnapshot();
        if (isMounted) setSnapshot(data);
      } catch (caught) {
        if (!isMounted) return;
        setError(caught instanceof Error ? caught.message : "Account-Daten konnten nicht geladen werden.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  async function refresh() {
    const data = await loadAccountSnapshot();
    setSnapshot(data);
  }

  async function mutate(action: () => Promise<unknown>): Promise<boolean> {
    setError(null);
    setIsMutating(true);

    try {
      await action();
      await refresh();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Die Aktion konnte nicht gespeichert werden.");
      return false;
    } finally {
      setIsMutating(false);
    }
  }

  async function importCsv(csv: string): Promise<CsvImportResult> {
    setError(null);
    setIsMutating(true);

    try {
      const result = await importAccountGradesCsv(csv);
      await refresh();
      return result;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "CSV konnte nicht importiert werden.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsMutating(false);
    }
  }

  async function logout() {
    setIsMutating(true);
    try {
      await logoutAccount();
      router.push("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Logout fehlgeschlagen.");
      setIsMutating(false);
    }
  }

  function setCurrentView(nextView: AccountView) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextView === "dashboard") {
      params.delete("view");
    } else {
      params.set("view", nextView);
    }

    const query = params.toString();
    router.replace(query ? `/account?${query}` : "/account");
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f6f8f7]" aria-busy="true">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-5">
          <p
            className="rounded-md border border-black/10 bg-white px-4 py-3 text-sm text-black/70 shadow-soft"
            role="status"
          >
            Account wird geladen...
          </p>
        </div>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="min-h-screen bg-[#f6f8f7]">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5">
          <Link href="/" className="text-sm font-semibold uppercase tracking-wide text-alpine">
            Notenrechner v2
          </Link>
          <section className="mt-6 rounded-lg border border-black/10 bg-white p-6 shadow-soft">
            <h1 className="text-2xl font-semibold text-ink">Einloggen erforderlich</h1>
            <p className="mt-2 text-sm leading-6 text-black/60" role={error ? "alert" : "status"}>
              {error ?? "Bitte melde dich an, um gespeicherte Noten zu verwenden."}
            </p>
            <Link
              href="/account/login"
              className="mt-5 inline-flex rounded-md bg-alpine px-4 py-2 text-sm font-semibold text-white"
            >
              Einloggen
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7]" aria-busy={isMutating}>
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
        <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
          <div>
            <Link href="/" className="text-sm font-semibold uppercase tracking-wide text-alpine">
              Notenrechner v2
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Account-Modus</h1>
            <p className="break-all text-sm text-black/60">{snapshot.user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/demo"
              className="rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-black/30"
            >
              Demo
            </Link>
            <Link
              href="/calculators"
              className="rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-black/30"
            >
              Rechner
            </Link>
            <button
              onClick={logout}
              disabled={isMutating}
              className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Logout
            </button>
          </div>
        </nav>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <AccountViewNav currentView={currentView} onChange={setCurrentView} snapshot={snapshot} />

        {currentView === "dashboard" ? (
          <DashboardView
            disabled={isMutating}
            snapshot={snapshot}
            onCreateGrade={(input) => mutate(() => createGrade(input))}
            onExportCsv={exportAccountCsv}
            onImportCsv={importCsv}
          />
        ) : null}

        {currentView === "subjects" ? (
          <SubjectsView
            disabled={isMutating}
            snapshot={snapshot}
            onArchive={(subject) => mutate(() => updateSubject(subject.id, { archived: !subject.archived }))}
            onCreateSubject={(input) => mutate(() => createSubject(input))}
            onDelete={(subject) => mutate(() => deleteSubject(subject.id))}
            onUpdateSubject={(subject, input) => mutate(() => updateSubject(subject.id, input))}
          />
        ) : null}

        {currentView === "terms" ? (
          <TermsView
            disabled={isMutating}
            snapshot={snapshot}
            onCreateTerm={(input) => mutate(() => createTerm(input))}
            onDelete={(term) => mutate(() => deleteTerm(term.id))}
            onToggleActive={(term) => mutate(() => updateTerm(term.id, { isActive: !term.isActive }))}
            onUpdateTerm={(term, input) => mutate(() => updateTerm(term.id, input))}
          />
        ) : null}

        {currentView === "grades" ? (
          <GradesView
            disabled={isMutating}
            snapshot={snapshot}
            onCreateGrade={(input) => mutate(() => createGrade(input))}
            onDelete={(grade) => mutate(() => deleteGrade(grade.id))}
            onUpdateGrade={(grade, input) => mutate(() => updateGrade(grade.id, input))}
          />
        ) : null}
      </div>
    </main>
  );
}

function AccountViewNav({
  currentView,
  onChange,
  snapshot,
}: {
  currentView: AccountView;
  onChange: (view: AccountView) => void;
  snapshot: AccountSnapshot;
}) {
  const counts: Record<AccountView, string> = {
    dashboard: String(snapshot.grades.length),
    subjects: String(snapshot.subjects.filter((subject) => !subject.archived).length),
    terms: String(snapshot.terms.length),
    grades: String(snapshot.grades.length),
  };

  return (
    <section className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {ACCOUNT_VIEWS.map((view) => {
        const isActive = currentView === view.value;

        return (
          <button
            key={view.value}
            onClick={() => onChange(view.value)}
            className={`rounded-lg border px-4 py-3 text-left transition ${
              isActive
                ? "border-alpine bg-alpine text-white shadow-soft"
                : "border-black/10 bg-white text-ink hover:border-black/25"
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-semibold">{view.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isActive ? "bg-white/20 text-white" : "bg-black/5 text-black/60"
                }`}
              >
                {counts[view.value]}
              </span>
            </span>
            <span className={`mt-1 block text-sm ${isActive ? "text-white/80" : "text-black/55"}`}>
              {view.description}
            </span>
          </button>
        );
      })}
    </section>
  );
}

function DashboardView({
  disabled,
  snapshot,
  onCreateGrade,
  onExportCsv,
  onImportCsv,
}: {
  disabled: boolean;
  snapshot: AccountSnapshot;
  onCreateGrade: (input: CreateGradeInput) => Promise<boolean>;
  onExportCsv: () => Promise<string>;
  onImportCsv: (csv: string) => Promise<CsvImportResult>;
}) {
  const certificationStatus = deriveSavedCertificationStatus(snapshot.subjects, snapshot.grades);

  return (
    <>
      <AccountSummary snapshot={snapshot} />
      <CertificationStatusCards status={certificationStatus} />
      <section className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="grid gap-4">
          <GradeForm
            disabled={disabled}
            subjects={snapshot.subjects.filter((subject) => !subject.archived)}
            terms={snapshot.terms}
            onSubmit={onCreateGrade}
          />
          <CertificationInputGuide />
        </div>
        <div className="grid gap-4">
          <RequiredGradeShortcut snapshot={snapshot} />
          <CsvImportExportPanel
            description="Exportiert Account-Daten ueber die API und importiert neue Noten persistent."
            disabled={disabled}
            filename="notenrechner-account-export.csv"
            subjects={snapshot.subjects}
            terms={snapshot.terms}
            title="CSV Import/Export"
            onExport={onExportCsv}
            onImport={(csv) => onImportCsv(csv)}
          />
          <RecentGrades grades={snapshot.grades} />
        </div>
      </section>
    </>
  );
}

function SubjectsView({
  disabled,
  snapshot,
  onArchive,
  onCreateSubject,
  onDelete,
  onUpdateSubject,
}: {
  disabled: boolean;
  snapshot: AccountSnapshot;
  onArchive: (subject: AccountSubject) => Promise<boolean>;
  onCreateSubject: (input: CreateSubjectInput) => Promise<boolean>;
  onDelete: (subject: AccountSubject) => Promise<boolean>;
  onUpdateSubject: (subject: AccountSubject, input: UpdateSubjectInput) => Promise<boolean>;
}) {
  const [editingSubject, setEditingSubject] = useState<AccountSubject | null>(null);

  async function submitSubject(input: SubjectFormInput) {
    const saved = editingSubject
      ? await onUpdateSubject(editingSubject, input)
      : await onCreateSubject({
          name: input.name,
          ...(input.shortName ? { shortName: input.shortName } : {}),
          ...(input.color ? { color: input.color } : {}),
          subjectType: input.subjectType,
        });

    if (saved) setEditingSubject(null);
    return saved;
  }

  async function archiveSubject(subject: AccountSubject) {
    const saved = await onArchive(subject);
    if (saved && editingSubject?.id === subject.id) setEditingSubject(null);
  }

  async function deleteSubject(subject: AccountSubject) {
    const deleted = await onDelete(subject);
    if (deleted && editingSubject?.id === subject.id) setEditingSubject(null);
  }

  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
      <SubjectForm
        key={editingSubject?.id ?? "create-subject"}
        disabled={disabled}
        editingSubject={editingSubject}
        onCancelEdit={() => setEditingSubject(null)}
        onSubmit={submitSubject}
      />
      <SubjectsPanel
        subjects={snapshot.subjects}
        grades={snapshot.grades}
        disabled={disabled}
        onArchive={(subject) => void archiveSubject(subject)}
        onDelete={(subject) => void deleteSubject(subject)}
        onEdit={setEditingSubject}
      />
    </section>
  );
}

function TermsView({
  disabled,
  snapshot,
  onCreateTerm,
  onDelete,
  onToggleActive,
  onUpdateTerm,
}: {
  disabled: boolean;
  snapshot: AccountSnapshot;
  onCreateTerm: (input: CreateTermInput) => Promise<boolean>;
  onDelete: (term: AccountTerm) => Promise<boolean>;
  onToggleActive: (term: AccountTerm) => Promise<boolean>;
  onUpdateTerm: (term: AccountTerm, input: UpdateTermInput) => Promise<boolean>;
}) {
  const [editingTerm, setEditingTerm] = useState<AccountTerm | null>(null);

  async function submitTerm(input: TermFormInput) {
    const saved = editingTerm ? await onUpdateTerm(editingTerm, input) : await onCreateTerm(input);
    if (saved) setEditingTerm(null);
    return saved;
  }

  async function toggleTermActive(term: AccountTerm) {
    const saved = await onToggleActive(term);
    if (saved && editingTerm?.id === term.id) setEditingTerm(null);
  }

  async function deleteTerm(term: AccountTerm) {
    const deleted = await onDelete(term);
    if (deleted && editingTerm?.id === term.id) setEditingTerm(null);
  }

  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
      <TermForm
        key={editingTerm?.id ?? "create-term"}
        disabled={disabled}
        editingTerm={editingTerm}
        onCancelEdit={() => setEditingTerm(null)}
        onSubmit={submitTerm}
      />
      <TermsPanel
        terms={snapshot.terms}
        disabled={disabled}
        onDelete={(term) => void deleteTerm(term)}
        onEdit={setEditingTerm}
        onToggleActive={(term) => void toggleTermActive(term)}
      />
    </section>
  );
}

function GradesView({
  disabled,
  snapshot,
  onCreateGrade,
  onDelete,
  onUpdateGrade,
}: {
  disabled: boolean;
  snapshot: AccountSnapshot;
  onCreateGrade: (input: CreateGradeInput) => Promise<boolean>;
  onDelete: (grade: AccountGrade) => Promise<boolean>;
  onUpdateGrade: (grade: AccountGrade, input: UpdateGradeInput) => Promise<boolean>;
}) {
  const [editingGrade, setEditingGrade] = useState<AccountGrade | null>(null);
  const formSubjects = editingGrade ? snapshot.subjects : snapshot.subjects.filter((subject) => !subject.archived);

  async function submitGrade(input: GradeFormInput) {
    const saved = editingGrade ? await onUpdateGrade(editingGrade, input) : await onCreateGrade(input);
    if (saved) setEditingGrade(null);
    return saved;
  }

  async function deleteGrade(grade: AccountGrade) {
    const deleted = await onDelete(grade);
    if (deleted && editingGrade?.id === grade.id) setEditingGrade(null);
  }

  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
      <GradeForm
        key={editingGrade?.id ?? "create-grade"}
        disabled={disabled}
        editingGrade={editingGrade}
        subjects={formSubjects}
        terms={snapshot.terms}
        onCancelEdit={() => setEditingGrade(null)}
        onSubmit={submitGrade}
      />
      <GradesPanel
        grades={snapshot.grades}
        disabled={disabled}
        subjects={snapshot.subjects.filter((subject) => !subject.archived)}
        terms={snapshot.terms}
        onDelete={(grade) => void deleteGrade(grade)}
        onEdit={setEditingGrade}
      />
    </section>
  );
}

function AccountSummary({ snapshot }: { snapshot: AccountSnapshot }) {
  const items = snapshot.grades.map((grade) => ({ value: gradeValue(grade), weight: gradeWeight(grade) }));
  const exactAverage = calculateWeightedAverage(items);
  const semesterGrade = calculateSemesterGrade(items);
  const belowFour = snapshot.grades.filter((grade) => gradeValue(grade) < 4);
  const activeTerm = snapshot.terms.find((term) => term.isActive);
  const subjectSummaries = buildSubjectSummaries(snapshot.subjects, snapshot.grades);
  const bestSubject = [...subjectSummaries.filter((summary) => summary.exactAverage !== null)].sort(byAverageDesc)[0];
  const worstSubject = [...subjectSummaries.filter((summary) => summary.exactAverage !== null)].sort(byAverageAsc)[0];

  return (
    <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <Metric label="Exakter Schnitt" value={exactAverage === null ? "-" : exactAverage.toFixed(2)} />
      <Metric label="Zeugnisnote" value={semesterGrade === null ? "-" : semesterGrade.toFixed(1)} />
      <Metric label="Unter 4.0" value={String(belowFour.length)} />
      <Metric label="Bestes Fach" value={bestSubject?.subject.shortName || bestSubject?.subject.name || "-"} />
      <Metric label="Kritisches Fach" value={worstSubject?.subject.shortName || worstSubject?.subject.name || "-"} />
      <Metric label="Aktives Semester" value={activeTerm?.name ?? "-"} />
    </section>
  );
}

function RequiredGradeShortcut({ snapshot }: { snapshot: AccountSnapshot }) {
  return (
    <ContextualRequiredGradePlanner
      description="Waehle Fach und Semester, um die naechste Pruefung konkret zu planen."
      grades={buildAccountRequiredGradeContextGrades(snapshot.grades)}
      subjects={buildAccountRequiredGradeSubjectOptions(snapshot.subjects)}
      terms={buildAccountRequiredGradeTermOptions(snapshot.terms)}
    />
  );
}

function RecentGrades({ grades }: { grades: AccountGrade[] }) {
  const recentGrades = [...grades].sort(byGradeDateDesc).slice(0, 5);

  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">Letzte Noten</h2>
      <div className="mt-3 overflow-hidden rounded-md border border-black/10">
        {recentGrades.map((grade) => (
          <div
            key={grade.id}
            className="grid gap-3 border-b border-black/10 p-4 last:border-b-0 sm:grid-cols-[1fr_auto]"
          >
            <div>
              <p className="font-semibold text-ink">{grade.title}</p>
              <p className="text-sm text-black/60">
                {grade.subject.name} / {grade.term?.name ?? "kein Semester"} / {formatDate(grade.date) ?? "ohne Datum"}
              </p>
            </div>
            <p className="text-2xl font-semibold text-ink">{gradeValue(grade).toFixed(2)}</p>
          </div>
        ))}
        {recentGrades.length === 0 ? <p className="p-4 text-sm text-black/60">Noch keine Noten erfasst.</p> : null}
      </div>
    </section>
  );
}

function SubjectForm({
  disabled,
  editingSubject,
  onCancelEdit,
  onSubmit,
}: {
  disabled: boolean;
  editingSubject?: AccountSubject | null;
  onCancelEdit?: () => void;
  onSubmit: (input: SubjectFormInput) => Promise<boolean>;
}) {
  const isEditing = Boolean(editingSubject);
  const [name, setName] = useState(editingSubject?.name ?? "");
  const [shortName, setShortName] = useState(editingSubject?.shortName ?? "");
  const [color, setColor] = useState(editingSubject?.color ?? DEFAULT_SUBJECT_COLOR);
  const [subjectType, setSubjectType] = useState<SubjectType>(editingSubject?.subjectType ?? "regular");
  const [archived, setArchived] = useState(editingSubject?.archived ?? false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<SubjectFormField>>({});
  const formId = `account-subject-${editingSubject?.id ?? "new"}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = subjectFormSchema.safeParse({ name, shortName, color, subjectType, archived });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod<SubjectFormField>(parsed.error));
      return;
    }

    const saved = await onSubmit(parsed.data);
    if (!saved) return;

    setName("");
    setShortName("");
    setColor(DEFAULT_SUBJECT_COLOR);
    setSubjectType("regular");
    setArchived(false);
    if (isEditing) onCancelEdit?.();
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">{isEditing ? "Fach bearbeiten" : "Fach erfassen"}</h2>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? fieldErrorId(formId, "name") : undefined}
            className={inputClassName(Boolean(fieldErrors.name))}
          />
          <FieldError id={fieldErrorId(formId, "name")} message={fieldErrors.name} />
        </label>
        <div className="grid grid-cols-[1fr_64px] gap-3">
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Kurzname
            <input
              value={shortName}
              onChange={(event) => setShortName(event.target.value)}
              aria-invalid={Boolean(fieldErrors.shortName)}
              aria-describedby={fieldErrors.shortName ? fieldErrorId(formId, "shortName") : undefined}
              className={inputClassName(Boolean(fieldErrors.shortName))}
            />
            <FieldError id={fieldErrorId(formId, "shortName")} message={fieldErrors.shortName} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Farbe
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              aria-invalid={Boolean(fieldErrors.color)}
              aria-describedby={fieldErrors.color ? fieldErrorId(formId, "color") : undefined}
              className="h-10 rounded-md border border-black/15 bg-white px-1 py-1"
            />
            <FieldError id={fieldErrorId(formId, "color")} message={fieldErrors.color} />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Typ
          <select
            value={subjectType}
            onChange={(event) => setSubjectType(event.target.value as SubjectType)}
            className="rounded-md border border-black/15 px-3 py-2"
          >
            {SUBJECT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        {isEditing ? (
          <label className="flex items-center gap-2 text-sm font-medium text-black/70">
            <input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} />
            Archiviert
          </label>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            disabled={disabled}
            className="rounded-md bg-alpine px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isEditing ? "Fach aktualisieren" : "Fach speichern"}
          </button>
          {isEditing ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onCancelEdit}
              className="rounded-md border border-black/15 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
            >
              Abbrechen
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function TermForm({
  disabled,
  editingTerm,
  onCancelEdit,
  onSubmit,
}: {
  disabled: boolean;
  editingTerm?: AccountTerm | null;
  onCancelEdit?: () => void;
  onSubmit: (input: TermFormInput) => Promise<boolean>;
}) {
  const isEditing = Boolean(editingTerm);
  const [name, setName] = useState(editingTerm?.name ?? "");
  const [startDate, setStartDate] = useState(dateInputValue(editingTerm?.startDate ?? null));
  const [endDate, setEndDate] = useState(dateInputValue(editingTerm?.endDate ?? null));
  const [isActive, setIsActive] = useState(editingTerm?.isActive ?? false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<TermFormField>>({});
  const formId = `account-term-${editingTerm?.id ?? "new"}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = termFormSchema.safeParse({ name, startDate, endDate, isActive });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod<TermFormField>(parsed.error));
      return;
    }

    const saved = await onSubmit(parsed.data);
    if (!saved) return;

    setName("");
    setStartDate("");
    setEndDate("");
    setIsActive(false);
    if (isEditing) onCancelEdit?.();
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">{isEditing ? "Semester bearbeiten" : "Semester erfassen"}</h2>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z.B. 3. Semester"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? fieldErrorId(formId, "name") : undefined}
            className={inputClassName(Boolean(fieldErrors.name))}
          />
          <FieldError id={fieldErrorId(formId, "name")} message={fieldErrors.name} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Start
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-invalid={Boolean(fieldErrors.startDate)}
              aria-describedby={fieldErrors.startDate ? fieldErrorId(formId, "startDate") : undefined}
              className={inputClassName(Boolean(fieldErrors.startDate))}
            />
            <FieldError id={fieldErrorId(formId, "startDate")} message={fieldErrors.startDate} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Ende
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              aria-invalid={Boolean(fieldErrors.endDate)}
              aria-describedby={fieldErrors.endDate ? fieldErrorId(formId, "endDate") : undefined}
              className={inputClassName(Boolean(fieldErrors.endDate))}
            />
            <FieldError id={fieldErrorId(formId, "endDate")} message={fieldErrors.endDate} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-black/70">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          Aktives Semester
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={disabled}
            className="rounded-md bg-lake px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isEditing ? "Semester aktualisieren" : "Semester speichern"}
          </button>
          {isEditing ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onCancelEdit}
              className="rounded-md border border-black/15 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
            >
              Abbrechen
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function GradeForm({
  disabled,
  editingGrade,
  onCancelEdit,
  subjects,
  terms,
  onSubmit,
}: {
  disabled: boolean;
  editingGrade?: AccountGrade | null;
  onCancelEdit?: () => void;
  subjects: AccountSubject[];
  terms: AccountTerm[];
  onSubmit: (input: GradeFormInput) => Promise<boolean>;
}) {
  const isEditing = Boolean(editingGrade);
  const [subjectId, setSubjectId] = useState(editingGrade?.subjectId ?? "");
  const [termId, setTermId] = useState(editingGrade?.termId ?? "");
  const [title, setTitle] = useState(editingGrade?.title ?? "");
  const [gradeValueInput, setGradeValueInput] = useState(editingGrade ? String(gradeValue(editingGrade)) : "4.5");
  const [weightInput, setWeightInput] = useState(editingGrade ? String(gradeWeight(editingGrade)) : "1");
  const [date, setDate] = useState(editingGrade ? dateInputValue(editingGrade.date) : today());
  const [type, setType] = useState<GradeType>(editingGrade?.type ?? "exam");
  const [notes, setNotes] = useState(editingGrade?.notes ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<GradeFormField>>({});
  const formId = `account-grade-${editingGrade?.id ?? "new"}`;

  const selectedSubjectId = subjectId || subjects[0]?.id || "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const parsed = gradeFormSchema.safeParse({
      subjectId: selectedSubjectId,
      termId,
      title,
      gradeValue: gradeValueInput,
      weight: weightInput,
      date,
      type,
      notes,
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod<GradeFormField>(parsed.error));
      return;
    }

    const saved = await onSubmit(parsed.data);
    if (!saved) return;

    setTitle("");
    setGradeValueInput("4.5");
    setWeightInput("1");
    setDate(today());
    setType("exam");
    setNotes("");
    if (isEditing) onCancelEdit?.();
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">{isEditing ? "Note bearbeiten" : "Note erfassen"}</h2>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Fach
          <select
            value={selectedSubjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            disabled={subjects.length === 0}
            aria-invalid={Boolean(fieldErrors.subjectId)}
            aria-describedby={fieldErrors.subjectId ? fieldErrorId(formId, "subjectId") : undefined}
            className={inputClassName(Boolean(fieldErrors.subjectId))}
          >
            {subjects.length === 0 ? <option>Erst ein Fach erstellen</option> : null}
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <FieldError id={fieldErrorId(formId, "subjectId")} message={fieldErrors.subjectId} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Semester
          <select
            value={termId}
            onChange={(event) => setTermId(event.target.value)}
            className="rounded-md border border-black/15 px-3 py-2"
          >
            <option value="">Kein Semester</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Titel
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? fieldErrorId(formId, "title") : undefined}
            className={inputClassName(Boolean(fieldErrors.title))}
          />
          <FieldError id={fieldErrorId(formId, "title")} message={fieldErrors.title} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Note
            <input
              value={gradeValueInput}
              onChange={(event) => setGradeValueInput(event.target.value)}
              inputMode="decimal"
              aria-invalid={Boolean(fieldErrors.gradeValue)}
              aria-describedby={fieldErrors.gradeValue ? fieldErrorId(formId, "gradeValue") : undefined}
              className={inputClassName(Boolean(fieldErrors.gradeValue))}
            />
            <FieldError id={fieldErrorId(formId, "gradeValue")} message={fieldErrors.gradeValue} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Gewicht
            <input
              value={weightInput}
              onChange={(event) => setWeightInput(event.target.value)}
              inputMode="decimal"
              aria-invalid={Boolean(fieldErrors.weight)}
              aria-describedby={fieldErrors.weight ? fieldErrorId(formId, "weight") : undefined}
              className={inputClassName(Boolean(fieldErrors.weight))}
            />
            <FieldError id={fieldErrorId(formId, "weight")} message={fieldErrors.weight} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Datum
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-invalid={Boolean(fieldErrors.date)}
              aria-describedby={fieldErrors.date ? fieldErrorId(formId, "date") : undefined}
              className={inputClassName(Boolean(fieldErrors.date))}
            />
            <FieldError id={fieldErrorId(formId, "date")} message={fieldErrors.date} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Typ
            <select
              value={type}
              onChange={(event) => setType(event.target.value as GradeType)}
              className="rounded-md border border-black/15 px-3 py-2"
            >
              {GRADE_TYPES.map((gradeType) => (
                <option key={gradeType.value} value={gradeType.value}>
                  {gradeType.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Notizen
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            aria-invalid={Boolean(fieldErrors.notes)}
            aria-describedby={fieldErrors.notes ? fieldErrorId(formId, "notes") : undefined}
            className={inputClassName(Boolean(fieldErrors.notes), "resize-none")}
          />
          <FieldError id={fieldErrorId(formId, "notes")} message={fieldErrors.notes} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={disabled || subjects.length === 0}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isEditing ? "Note aktualisieren" : "Note speichern"}
          </button>
          {isEditing ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onCancelEdit}
              className="rounded-md border border-black/15 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
            >
              Abbrechen
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function SubjectsPanel({
  subjects,
  grades,
  disabled,
  onArchive,
  onDelete,
  onEdit,
}: {
  subjects: AccountSubject[];
  grades: AccountGrade[];
  disabled: boolean;
  onArchive: (subject: AccountSubject) => void;
  onDelete: (subject: AccountSubject) => void;
  onEdit: (subject: AccountSubject) => void;
}) {
  const summaries = buildSubjectSummaries(subjects, grades);

  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">Faecher</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {summaries.map((summary) => (
          <article key={summary.subject.id} className="rounded-md border border-black/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: summary.subject.color ?? DEFAULT_SUBJECT_COLOR }}
                    aria-hidden
                  />
                  <h3 className="min-w-0 break-words font-semibold text-ink">{summary.subject.name}</h3>
                </div>
                <p className="mt-1 text-xs uppercase tracking-wide text-black/45">
                  {summary.subject.archived ? "Archiviert" : subjectTypeLabel(summary.subject.subjectType)}
                </p>
              </div>
              <p className="shrink-0 text-2xl font-semibold text-ink">
                {summary.semesterGrade === null ? "-" : summary.semesterGrade.toFixed(1)}
              </p>
            </div>
            <p className="mt-3 text-sm text-black/60">
              {summary.gradeCount} Noten, exakt {summary.exactAverage === null ? "-" : summary.exactAverage.toFixed(2)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                disabled={disabled}
                onClick={() => onEdit(summary.subject)}
                className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-black/70 disabled:opacity-60"
              >
                Bearbeiten
              </button>
              <button
                disabled={disabled}
                onClick={() => onArchive(summary.subject)}
                className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-black/70 disabled:opacity-60"
              >
                {summary.subject.archived ? "Aktivieren" : "Archivieren"}
              </button>
              <button
                disabled={disabled}
                onClick={() => {
                  if (confirmDestructiveAction(`Fach "${summary.subject.name}" wirklich loeschen?`)) {
                    onDelete(summary.subject);
                  }
                }}
                className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 disabled:opacity-60"
              >
                Loeschen
              </button>
            </div>
          </article>
        ))}
        {subjects.length === 0 ? <p className="text-sm text-black/60">Noch keine Faecher erfasst.</p> : null}
      </div>
    </section>
  );
}

function TermsPanel({
  terms,
  disabled,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  terms: AccountTerm[];
  disabled: boolean;
  onEdit: (term: AccountTerm) => void;
  onToggleActive: (term: AccountTerm) => void;
  onDelete: (term: AccountTerm) => void;
}) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">Semester</h2>
      <div className="mt-3 overflow-hidden rounded-md border border-black/10">
        {terms.map((term) => (
          <div
            key={term.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 p-4 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="break-words font-semibold text-ink">{term.name}</p>
              <p className="break-words text-sm text-black/60">
                {formatDate(term.startDate) || "Offen"} bis {formatDate(term.endDate) || "offen"}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                disabled={disabled}
                onClick={() => onEdit(term)}
                className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-black/70 disabled:opacity-60"
              >
                Bearbeiten
              </button>
              <button
                disabled={disabled}
                onClick={() => onToggleActive(term)}
                className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-black/70 disabled:opacity-60"
              >
                {term.isActive ? "Aktiv" : "Aktiv setzen"}
              </button>
              <button
                disabled={disabled}
                onClick={() => {
                  if (confirmDestructiveAction(`Semester "${term.name}" wirklich loeschen?`)) {
                    onDelete(term);
                  }
                }}
                className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 disabled:opacity-60"
              >
                Loeschen
              </button>
            </div>
          </div>
        ))}
        {terms.length === 0 ? <p className="p-4 text-sm text-black/60">Noch keine Semester erfasst.</p> : null}
      </div>
    </section>
  );
}

function GradesPanel({
  grades,
  disabled,
  subjects,
  terms,
  onDelete,
  onEdit,
}: {
  grades: AccountGrade[];
  disabled: boolean;
  subjects: AccountSubject[];
  terms: AccountTerm[];
  onDelete: (grade: AccountGrade) => void;
  onEdit: (grade: AccountGrade) => void;
}) {
  const [filters, setFilters] = useState<GradeFilters>(DEFAULT_GRADE_FILTERS);
  const subjectOptions = useMemo(() => buildAccountSubjectFilterOptions(grades), [grades]);
  const termOptions = useMemo(() => buildAccountTermFilterOptions(grades), [grades]);
  const filteredGrades = useMemo(() => filterAndSortAccountGrades(grades, filters), [grades, filters]);
  const activeFilterLabels = useMemo(
    () => buildAccountActiveFilterLabels(filters, subjectOptions, termOptions),
    [filters, subjectOptions, termOptions],
  );

  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Noten</h2>
          <p className="text-sm text-black/60">Persistente Daten aus dem Account.</p>
        </div>
      </div>
      <div className="mt-4">
        <ContextualRequiredGradePlanner
          description="Plant die naechste Note nur aus dem gewaehlten Fach und Semester."
          grades={buildAccountRequiredGradeContextGrades(grades)}
          subjects={buildAccountRequiredGradeSubjectOptions(subjects)}
          terms={buildAccountRequiredGradeTermOptions(terms)}
          title="Kontext-Rechner"
          variant="embedded"
        />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(180px,1.6fr)_repeat(3,minmax(140px,1fr))]">
        <label className="grid gap-1 text-xs font-medium text-black/60">
          Suche
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Titel oder Notizen"
            className="rounded-md border border-black/15 px-3 py-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-black/60">
          Fach
          <select
            value={filters.subjectId}
            onChange={(event) => setFilters((current) => ({ ...current, subjectId: event.target.value }))}
            className="rounded-md border border-black/15 px-3 py-2 text-sm"
          >
            <option value="">Alle Faecher</option>
            {subjectOptions.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-black/60">
          Semester
          <select
            value={filters.termId}
            onChange={(event) => setFilters((current) => ({ ...current, termId: event.target.value }))}
            className="rounded-md border border-black/15 px-3 py-2 text-sm"
          >
            <option value="">Alle Semester</option>
            <option value={NO_TERM_FILTER}>Kein Semester</option>
            {termOptions.map((term) => (
              <option key={term.id} value={term.id}>
                {term.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-black/60">
          Typ
          <select
            value={filters.type}
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
            className="rounded-md border border-black/15 px-3 py-2 text-sm"
          >
            <option value="">Alle Typen</option>
            {GRADE_TYPES.map((gradeType) => (
              <option key={gradeType.value} value={gradeType.value}>
                {gradeType.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-black/60">
          Von
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
            className="rounded-md border border-black/15 px-3 py-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-black/60">
          Bis
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
            className="rounded-md border border-black/15 px-3 py-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-black/60">
          Sortierung
          <select
            value={filters.sort}
            onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as GradeSort }))}
            className="rounded-md border border-black/15 px-3 py-2 text-sm"
          >
            {GRADE_SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-xs font-medium text-black/60">
          <input
            type="checkbox"
            checked={filters.belowFourOnly}
            onChange={(event) => setFilters((current) => ({ ...current, belowFourOnly: event.target.checked }))}
          />
          Unter 4.0
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-black/60">
        <p>
          {filteredGrades.length} von {grades.length} Noten
        </p>
        {activeFilterLabels.length > 0 ? (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_GRADE_FILTERS)}
            className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-ink hover:border-black/30"
          >
            Filter zuruecksetzen
          </button>
        ) : null}
      </div>
      {activeFilterLabels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeFilterLabels.map((label) => (
            <span key={label} className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-black/60">
              {label}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-4 overflow-hidden rounded-md border border-black/10">
        {filteredGrades.map((grade) => (
          <div
            key={grade.id}
            className="grid gap-3 border-b border-black/10 p-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto_auto]"
          >
            <div className="min-w-0">
              <p className="break-words font-semibold text-ink">{grade.title}</p>
              <p className="break-words text-sm text-black/60">
                {grade.subject.name} / {grade.term?.name ?? "kein Semester"} / {gradeTypeLabel(grade.type)} / Gewicht{" "}
                {gradeWeight(grade)}
              </p>
              {grade.date || grade.notes ? (
                <p className="mt-1 break-words text-xs text-black/45">
                  {formatDate(grade.date) ?? "Kein Datum"}
                  {grade.notes ? ` - ${grade.notes}` : ""}
                </p>
              ) : null}
            </div>
            <p className="shrink-0 text-2xl font-semibold text-ink">{gradeValue(grade).toFixed(2)}</p>
            <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
              <button
                disabled={disabled}
                onClick={() => onEdit(grade)}
                className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-black/70 disabled:opacity-60"
              >
                Bearbeiten
              </button>
              <button
                disabled={disabled}
                onClick={() => {
                  if (confirmDestructiveAction(`Note "${grade.title}" wirklich loeschen?`)) {
                    onDelete(grade);
                  }
                }}
                className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 disabled:opacity-60"
              >
                Loeschen
              </button>
            </div>
          </div>
        ))}
        {grades.length === 0 ? <p className="p-4 text-sm text-black/60">Noch keine Noten erfasst.</p> : null}
        {grades.length > 0 && filteredGrades.length === 0 ? (
          <p className="p-4 text-sm text-black/60">Keine Noten passen zu den aktuellen Filtern.</p>
        ) : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <p className="text-sm text-black/60">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold leading-tight text-ink">{value}</p>
    </article>
  );
}

function buildSubjectSummaries(subjects: AccountSubject[], grades: AccountGrade[]) {
  return subjects.map((subject) => {
    const subjectGrades = grades.filter((grade) => grade.subjectId === subject.id);
    const items = subjectGrades.map((grade) => ({ value: gradeValue(grade), weight: gradeWeight(grade) }));

    return {
      subject,
      gradeCount: subjectGrades.length,
      exactAverage: calculateWeightedAverage(items),
      semesterGrade: calculateSemesterGrade(items),
    };
  });
}

function byAverageDesc(left: { exactAverage: number | null }, right: { exactAverage: number | null }) {
  return (right.exactAverage ?? -Infinity) - (left.exactAverage ?? -Infinity);
}

function byAverageAsc(left: { exactAverage: number | null }, right: { exactAverage: number | null }) {
  return (left.exactAverage ?? Infinity) - (right.exactAverage ?? Infinity);
}

function byGradeDateDesc(left: AccountGrade, right: AccountGrade) {
  return dateSortValue(right.date) - dateSortValue(left.date);
}

function filterAndSortAccountGrades(grades: AccountGrade[], filters: GradeFilters): AccountGrade[] {
  return grades
    .filter((grade) => matchesAccountGradeFilters(grade, filters))
    .sort((left, right) => {
      const compared = compareAccountGrades(left, right, filters.sort);
      if (compared !== 0) return compared;
      return byGradeDateDesc(left, right) || left.title.localeCompare(right.title);
    });
}

function matchesAccountGradeFilters(grade: AccountGrade, filters: GradeFilters): boolean {
  const search = filters.search.trim().toLowerCase();
  if (search && !`${grade.title} ${grade.notes ?? ""}`.toLowerCase().includes(search)) return false;
  if (filters.subjectId && grade.subjectId !== filters.subjectId) return false;
  if (filters.termId === NO_TERM_FILTER && grade.termId !== null) return false;
  if (filters.termId && filters.termId !== NO_TERM_FILTER && grade.termId !== filters.termId) return false;
  if (filters.type && grade.type !== filters.type) return false;
  if (filters.belowFourOnly && gradeValue(grade) >= 4) return false;

  const gradeDate = dateInputValue(grade.date);
  if (filters.dateFrom && (!gradeDate || gradeDate < filters.dateFrom)) return false;
  if (filters.dateTo && (!gradeDate || gradeDate > filters.dateTo)) return false;

  return true;
}

function compareAccountGrades(left: AccountGrade, right: AccountGrade, sort: GradeSort): number {
  switch (sort) {
    case "date-asc":
      return dateSortValue(left.date) - dateSortValue(right.date);
    case "grade-desc":
      return gradeValue(right) - gradeValue(left);
    case "grade-asc":
      return gradeValue(left) - gradeValue(right);
    case "subject-asc":
      return left.subject.name.localeCompare(right.subject.name);
    case "subject-desc":
      return right.subject.name.localeCompare(left.subject.name);
    case "term-asc":
      return gradeTermLabel(left).localeCompare(gradeTermLabel(right));
    case "term-desc":
      return gradeTermLabel(right).localeCompare(gradeTermLabel(left));
    case "weight-desc":
      return gradeWeight(right) - gradeWeight(left);
    case "weight-asc":
      return gradeWeight(left) - gradeWeight(right);
    case "date-desc":
    default:
      return dateSortValue(right.date) - dateSortValue(left.date);
  }
}

function buildAccountSubjectFilterOptions(grades: AccountGrade[]) {
  const subjects = new Map<string, string>();
  for (const grade of grades) {
    subjects.set(grade.subjectId, grade.subject.name);
  }

  return Array.from(subjects, ([id, label]) => ({ id, label })).sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

function buildAccountTermFilterOptions(grades: AccountGrade[]) {
  const terms = new Map<string, string>();
  for (const grade of grades) {
    if (grade.termId && grade.term) terms.set(grade.termId, grade.term.name);
  }

  return Array.from(terms, ([id, label]) => ({ id, label })).sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

function buildAccountRequiredGradeSubjectOptions(subjects: AccountSubject[]) {
  return subjects
    .filter((subject) => !subject.archived)
    .map((subject) => ({
      id: subject.id,
      label: subject.shortName ? `${subject.shortName} - ${subject.name}` : subject.name,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function buildAccountRequiredGradeTermOptions(terms: AccountTerm[]) {
  return terms
    .map((term) => ({
      id: term.id,
      label: term.isActive ? `${term.name} (aktiv)` : term.name,
      isActive: term.isActive,
    }))
    .sort((left, right) => Number(right.isActive) - Number(left.isActive) || left.label.localeCompare(right.label));
}

function buildAccountRequiredGradeContextGrades(grades: AccountGrade[]) {
  return grades.map((grade) => ({
    subjectId: grade.subjectId,
    termId: grade.termId,
    value: gradeValue(grade),
    weight: gradeWeight(grade),
  }));
}

function buildAccountActiveFilterLabels(
  filters: GradeFilters,
  subjects: { id: string; label: string }[],
  terms: { id: string; label: string }[],
): string[] {
  const labels: string[] = [];
  if (filters.search.trim()) labels.push(`Suche: ${filters.search.trim()}`);
  if (filters.subjectId) labels.push(`Fach: ${subjects.find((subject) => subject.id === filters.subjectId)?.label}`);
  if (filters.termId === NO_TERM_FILTER) labels.push("Semester: keines");
  if (filters.termId && filters.termId !== NO_TERM_FILTER) {
    labels.push(`Semester: ${terms.find((term) => term.id === filters.termId)?.label}`);
  }
  if (filters.type) labels.push(`Typ: ${gradeTypeLabel(filters.type as GradeType)}`);
  if (filters.dateFrom) labels.push(`Von: ${filters.dateFrom}`);
  if (filters.dateTo) labels.push(`Bis: ${filters.dateTo}`);
  if (filters.belowFourOnly) labels.push("Unter 4.0");
  if (filters.sort !== DEFAULT_GRADE_FILTERS.sort) {
    labels.push(`Sort: ${GRADE_SORTS.find((sort) => sort.value === filters.sort)?.label}`);
  }
  return labels.filter((label) => !label.endsWith("undefined"));
}

function gradeTermLabel(grade: AccountGrade): string {
  return grade.term?.name ?? "kein Semester";
}

function dateSortValue(value: string | null): number {
  if (!value) return 0;
  return new Date(value).getTime();
}

function gradeValue(grade: AccountGrade): number {
  return Number(grade.gradeValue);
}

function gradeWeight(grade: AccountGrade): number {
  return Number(grade.weight);
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("de-CH").format(new Date(value));
}

function dateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function subjectTypeLabel(value: SubjectType): string {
  return SUBJECT_TYPES.find((type) => type.value === value)?.label ?? value;
}

function gradeTypeLabel(value: GradeType): string {
  return GRADE_TYPES.find((type) => type.value === value)?.label ?? value;
}

function confirmDestructiveAction(message: string): boolean {
  return window.confirm(message);
}

function parseAccountView(value: string | null): AccountView {
  if (value === "subjects" || value === "terms" || value === "grades") return value;
  return "dashboard";
}
