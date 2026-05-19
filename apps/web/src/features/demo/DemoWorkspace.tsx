"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GradeType, SubjectType, calculateSemesterGrade, calculateWeightedAverage } from "@notenrechner/shared";

import { ContextualRequiredGradePlanner } from "../calculators/ContextualRequiredGradePlanner";
import { CertificationStatusCards } from "../certification/CertificationStatusCards";
import { deriveSavedCertificationStatus } from "../certification/saved-data-status";
import { CsvImportExportPanel } from "../import-export/CsvImportExportPanel";
import { CsvImportPreview, buildGradeCsv } from "../import-export/grade-csv";
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
import { DemoGrade, DemoState, DemoSubject, DemoTerm, demoSeed } from "./demo-data";

const STORAGE_KEY = "notenrechner-v2-demo";
const DEFAULT_COLOR = "#1f7a68";

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

type SubjectDraft = {
  name: string;
  shortName: string;
  color: string;
  subjectType: SubjectType;
};

type TermDraft = {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

type GradeDraft = {
  subjectId: string;
  termId: string;
  title: string;
  value: string;
  weight: string;
  date: string;
  type: GradeType;
  notes: string;
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

const emptySubjectDraft: SubjectDraft = {
  name: "",
  shortName: "",
  color: DEFAULT_COLOR,
  subjectType: "regular",
};

const emptyTermDraft: TermDraft = {
  name: "",
  startDate: "",
  endDate: "",
  isActive: false,
};

const emptyGradeDraft: GradeDraft = {
  subjectId: "",
  termId: "",
  title: "",
  value: "4.5",
  weight: "1",
  date: today(),
  type: "exam",
  notes: "",
};

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

export function DemoWorkspace() {
  const [state, setState] = useState<DemoState>(() => cloneDemoState(demoSeed));
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState<SubjectDraft>(emptySubjectDraft);
  const [subjectErrors, setSubjectErrors] = useState<FieldErrors<SubjectFormField>>({});
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [termDraft, setTermDraft] = useState<TermDraft>(emptyTermDraft);
  const [termErrors, setTermErrors] = useState<FieldErrors<TermFormField>>({});
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [gradeDraft, setGradeDraft] = useState<GradeDraft>(emptyGradeDraft);
  const [gradeErrors, setGradeErrors] = useState<FieldErrors<GradeFormField>>({});
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [resetArmed, setResetArmed] = useState(false);

  useEffect(() => {
    // Hydration starts from seed data, then reconciles browser-only localStorage after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadStoredState);
    setHasLoadedStorage(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hasLoadedStorage, state]);

  const activeSubjects = state.subjects.filter((subject) => !subject.archived);
  const subjectIds = new Set(state.subjects.map((subject) => subject.id));
  const selectedSubjectId = subjectIds.has(gradeDraft.subjectId)
    ? gradeDraft.subjectId
    : activeSubjects[0]?.id || state.subjects[0]?.id || "";

  const allItems = useMemo(
    () => state.grades.map((grade) => ({ value: grade.value, weight: grade.weight })),
    [state.grades],
  );
  const exactAverage = calculateWeightedAverage(allItems);
  const semesterGrade = calculateSemesterGrade(allItems);
  const belowFour = state.grades.filter((grade) => grade.value < 4);
  const subjectSummaries = useMemo(() => buildSubjectSummaries(state.subjects, state.grades), [state]);
  const activeTerm = state.terms.find((term) => term.isActive);
  const certificationStatus = useMemo(() => deriveSavedCertificationStatus(state.subjects, state.grades), [state]);

  function saveSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubjectErrors({});

    const parsed = subjectFormSchema.safeParse({ ...subjectDraft, archived: false });
    if (!parsed.success) {
      setSubjectErrors(fieldErrorsFromZod<SubjectFormField>(parsed.error));
      return;
    }

    const nextSubject: DemoSubject = {
      id: editingSubjectId ?? createId("subject"),
      name: parsed.data.name,
      shortName: parsed.data.shortName,
      color: parsed.data.color || DEFAULT_COLOR,
      subjectType: parsed.data.subjectType,
      archived: state.subjects.find((subject) => subject.id === editingSubjectId)?.archived ?? false,
    };

    setState((current) => ({
      ...current,
      subjects: editingSubjectId
        ? current.subjects.map((subject) => (subject.id === editingSubjectId ? nextSubject : subject))
        : [nextSubject, ...current.subjects],
    }));
    setSubjectDraft(emptySubjectDraft);
    setSubjectErrors({});
    setEditingSubjectId(null);
  }

  function startEditSubject(subject: DemoSubject) {
    setSubjectErrors({});
    setSubjectDraft({
      name: subject.name,
      shortName: subject.shortName ?? "",
      color: subject.color ?? DEFAULT_COLOR,
      subjectType: subject.subjectType,
    });
    setEditingSubjectId(subject.id);
  }

  function toggleSubjectArchived(subjectId: string) {
    setState((current) => ({
      ...current,
      subjects: current.subjects.map((subject) =>
        subject.id === subjectId ? { ...subject, archived: !subject.archived } : subject,
      ),
    }));
  }

  function deleteSubject(subjectId: string) {
    setState((current) => ({
      ...current,
      subjects: current.subjects.filter((subject) => subject.id !== subjectId),
      grades: current.grades.filter((grade) => grade.subjectId !== subjectId),
    }));
    if (editingSubjectId === subjectId) {
      setEditingSubjectId(null);
      setSubjectDraft(emptySubjectDraft);
      setSubjectErrors({});
    }
    if (gradeDraft.subjectId === subjectId) {
      setGradeDraft((current) => ({ ...current, subjectId: "" }));
    }
  }

  function saveTerm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTermErrors({});

    const parsed = termFormSchema.safeParse(termDraft);
    if (!parsed.success) {
      setTermErrors(fieldErrorsFromZod<TermFormField>(parsed.error));
      return;
    }

    const nextTerm: DemoTerm = {
      id: editingTermId ?? createId("term"),
      name: parsed.data.name,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      isActive: parsed.data.isActive,
    };

    setState((current) => ({
      ...current,
      terms: upsertTerm(current.terms, nextTerm, editingTermId),
    }));
    setTermDraft(emptyTermDraft);
    setTermErrors({});
    setEditingTermId(null);
  }

  function startEditTerm(term: DemoTerm) {
    setTermErrors({});
    setTermDraft({
      name: term.name,
      startDate: term.startDate ?? "",
      endDate: term.endDate ?? "",
      isActive: term.isActive,
    });
    setEditingTermId(term.id);
  }

  function toggleTermActive(termId: string) {
    setState((current) => ({
      ...current,
      terms: current.terms.map((term) => ({
        ...term,
        isActive: term.id === termId ? !term.isActive : false,
      })),
    }));
  }

  function deleteTerm(termId: string) {
    setState((current) => ({
      ...current,
      terms: current.terms.filter((term) => term.id !== termId),
      grades: current.grades.map((grade) => (grade.termId === termId ? { ...grade, termId: null } : grade)),
    }));
    if (editingTermId === termId) {
      setEditingTermId(null);
      setTermDraft(emptyTermDraft);
      setTermErrors({});
    }
    if (gradeDraft.termId === termId) {
      setGradeDraft((current) => ({ ...current, termId: "" }));
    }
  }

  function saveGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGradeErrors({});

    const parsed = gradeFormSchema.safeParse({
      subjectId: selectedSubjectId,
      termId: gradeDraft.termId,
      title: gradeDraft.title,
      gradeValue: gradeDraft.value,
      weight: gradeDraft.weight,
      date: gradeDraft.date,
      type: gradeDraft.type,
      notes: gradeDraft.notes,
    });
    if (!parsed.success) {
      setGradeErrors(fieldErrorsFromZod<GradeFormField>(parsed.error));
      return;
    }

    const nextGrade: DemoGrade = {
      id: editingGradeId ?? createId("grade"),
      subjectId: parsed.data.subjectId,
      termId: parsed.data.termId,
      title: parsed.data.title,
      value: parsed.data.gradeValue,
      weight: parsed.data.weight,
      date: parsed.data.date,
      type: parsed.data.type,
      notes: parsed.data.notes,
    };

    setState((current) => ({
      ...current,
      grades: editingGradeId
        ? current.grades.map((grade) => (grade.id === editingGradeId ? nextGrade : grade))
        : [nextGrade, ...current.grades],
    }));
    setGradeDraft({ ...emptyGradeDraft, subjectId: selectedSubjectId, termId: gradeDraft.termId });
    setGradeErrors({});
    setEditingGradeId(null);
  }

  function startEditGrade(grade: DemoGrade) {
    setGradeErrors({});
    setGradeDraft({
      subjectId: grade.subjectId,
      termId: grade.termId ?? "",
      title: grade.title,
      value: String(grade.value),
      weight: String(grade.weight),
      date: grade.date ?? "",
      type: grade.type,
      notes: grade.notes ?? "",
    });
    setEditingGradeId(grade.id);
  }

  function deleteGrade(gradeId: string) {
    setState((current) => ({
      ...current,
      grades: current.grades.filter((grade) => grade.id !== gradeId),
    }));
    if (editingGradeId === gradeId) {
      setEditingGradeId(null);
      setGradeDraft(emptyGradeDraft);
      setGradeErrors({});
    }
  }

  function resetDemo() {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }

    setState(cloneDemoState(demoSeed));
    setSubjectDraft(emptySubjectDraft);
    setTermDraft(emptyTermDraft);
    setGradeDraft(emptyGradeDraft);
    setEditingSubjectId(null);
    setEditingTermId(null);
    setEditingGradeId(null);
    setResetArmed(false);
  }

  function exportDemoCsv() {
    return buildGradeCsv(buildDemoCsvGrades(state.grades), state.subjects, state.terms);
  }

  function importDemoCsv(_csv: string, preview: CsvImportPreview) {
    const importedGrades: DemoGrade[] = preview.drafts.map((draft) => ({
      id: createId("grade"),
      subjectId: draft.subjectId,
      termId: draft.termId,
      title: draft.title,
      value: draft.value,
      weight: draft.weight,
      date: draft.date,
      type: draft.type,
      notes: draft.notes,
    }));

    setState((current) => ({
      ...current,
      grades: [...importedGrades, ...current.grades],
    }));

    return { imported: importedGrades.length, errors: [] };
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7]">
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
        <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
          <div>
            <Link href="/" className="text-sm font-semibold uppercase tracking-wide text-alpine">
              Notenrechner v2
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Demo-Modus</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={resetDemo}
              className={`rounded-md border px-4 py-2 text-sm font-semibold ${
                resetArmed
                  ? "border-red-200 bg-red-50 text-red-700 hover:border-red-300"
                  : "border-black/15 bg-white text-ink hover:border-black/30"
              }`}
            >
              {resetArmed ? "Reset bestaetigen" : "Demo zuruecksetzen"}
            </button>
            {resetArmed ? (
              <button
                onClick={() => setResetArmed(false)}
                className="rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-black/30"
              >
                Abbrechen
              </button>
            ) : null}
            <Link
              href="/calculators"
              className="rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-black/30"
            >
              Rechner
            </Link>
            <Link href="/account/register" className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">
              Account erstellen
            </Link>
          </div>
        </nav>

        <p className="mt-4 rounded-md border border-signal/25 bg-signal/10 px-4 py-3 text-sm text-black/70">
          Demo-Daten bleiben nur in diesem Browser. Die Bedienung entspricht dem Account-Modus; ein Account speichert
          deine Faecher, Semester und Noten dauerhaft in PostgreSQL.
        </p>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Metric label="Exakter Schnitt" value={exactAverage === null ? "-" : exactAverage.toFixed(2)} />
          <Metric label="Zeugnisnote" value={semesterGrade === null ? "-" : semesterGrade.toFixed(1)} />
          <Metric label="Unter 4.0" value={String(belowFour.length)} />
          <Metric label="Faecher aktiv" value={String(activeSubjects.length)} />
          <Metric label="Aktives Semester" value={activeTerm?.name ?? "-"} />
          <Metric label="Erfasste Noten" value={String(state.grades.length)} />
        </section>

        <CertificationStatusCards status={certificationStatus} />

        <section className="mt-6 grid gap-6 xl:grid-cols-[390px_1fr]">
          <div className="grid gap-4">
            <SubjectForm
              draft={subjectDraft}
              editing={editingSubjectId !== null}
              errors={subjectErrors}
              onCancel={() => {
                setSubjectDraft(emptySubjectDraft);
                setSubjectErrors({});
                setEditingSubjectId(null);
              }}
              onChange={setSubjectDraft}
              onSubmit={saveSubject}
            />
            <TermForm
              draft={termDraft}
              editing={editingTermId !== null}
              errors={termErrors}
              onCancel={() => {
                setTermDraft(emptyTermDraft);
                setTermErrors({});
                setEditingTermId(null);
              }}
              onChange={setTermDraft}
              onSubmit={saveTerm}
            />
            <GradeForm
              draft={gradeDraft}
              editing={editingGradeId !== null}
              errors={gradeErrors}
              selectedSubjectId={selectedSubjectId}
              subjects={state.subjects}
              terms={state.terms}
              onCancel={() => {
                setGradeDraft(emptyGradeDraft);
                setGradeErrors({});
                setEditingGradeId(null);
              }}
              onChange={setGradeDraft}
              onSubmit={saveGrade}
            />
            <CsvImportExportPanel
              description="Exportiert und importiert lokale Demo-Noten in diesem Browser."
              filename="notenrechner-demo-export.csv"
              subjects={state.subjects}
              terms={state.terms}
              title="CSV Import/Export"
              onExport={exportDemoCsv}
              onImport={importDemoCsv}
            />
          </div>

          <div className="grid gap-4">
            <SubjectsPanel
              summaries={subjectSummaries}
              onArchive={toggleSubjectArchived}
              onDelete={deleteSubject}
              onEdit={startEditSubject}
            />
            <TermsPanel
              terms={state.terms}
              onDelete={deleteTerm}
              onEdit={startEditTerm}
              onToggleActive={toggleTermActive}
            />
            <GradesPanel
              grades={state.grades}
              subjects={state.subjects}
              terms={state.terms}
              onDelete={deleteGrade}
              onEdit={startEditGrade}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function SubjectForm({
  draft,
  editing,
  errors,
  onCancel,
  onChange,
  onSubmit,
}: {
  draft: SubjectDraft;
  editing: boolean;
  errors: FieldErrors<SubjectFormField>;
  onCancel: () => void;
  onChange: (draft: SubjectDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const formId = editing ? "demo-subject-edit" : "demo-subject-new";

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{editing ? "Fach bearbeiten" : "Fach erfassen"}</h2>
        {editing ? (
          <button type="button" onClick={onCancel} className="text-sm font-semibold text-black/60 hover:text-ink">
            Abbrechen
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Name
          <input
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? fieldErrorId(formId, "name") : undefined}
            className={inputClassName(Boolean(errors.name))}
          />
          <FieldError id={fieldErrorId(formId, "name")} message={errors.name} />
        </label>
        <div className="grid grid-cols-[1fr_64px] gap-3">
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Kurzname
            <input
              value={draft.shortName}
              onChange={(event) => onChange({ ...draft, shortName: event.target.value })}
              aria-invalid={Boolean(errors.shortName)}
              aria-describedby={errors.shortName ? fieldErrorId(formId, "shortName") : undefined}
              className={inputClassName(Boolean(errors.shortName))}
            />
            <FieldError id={fieldErrorId(formId, "shortName")} message={errors.shortName} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Farbe
            <input
              type="color"
              value={draft.color}
              onChange={(event) => onChange({ ...draft, color: event.target.value })}
              aria-invalid={Boolean(errors.color)}
              aria-describedby={errors.color ? fieldErrorId(formId, "color") : undefined}
              className="h-10 rounded-md border border-black/15 bg-white px-1 py-1"
            />
            <FieldError id={fieldErrorId(formId, "color")} message={errors.color} />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Typ
          <select
            value={draft.subjectType}
            onChange={(event) => onChange({ ...draft, subjectType: event.target.value as SubjectType })}
            className="rounded-md border border-black/15 px-3 py-2"
          >
            {SUBJECT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-md bg-alpine px-4 py-2 text-sm font-semibold text-white hover:bg-[#176653]">
          {editing ? "Fach aktualisieren" : "Fach speichern"}
        </button>
      </div>
    </form>
  );
}

function TermForm({
  draft,
  editing,
  errors,
  onCancel,
  onChange,
  onSubmit,
}: {
  draft: TermDraft;
  editing: boolean;
  errors: FieldErrors<TermFormField>;
  onCancel: () => void;
  onChange: (draft: TermDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const formId = editing ? "demo-term-edit" : "demo-term-new";

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{editing ? "Semester bearbeiten" : "Semester erfassen"}</h2>
        {editing ? (
          <button type="button" onClick={onCancel} className="text-sm font-semibold text-black/60 hover:text-ink">
            Abbrechen
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Name
          <input
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            placeholder="z.B. 3. Semester"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? fieldErrorId(formId, "name") : undefined}
            className={inputClassName(Boolean(errors.name))}
          />
          <FieldError id={fieldErrorId(formId, "name")} message={errors.name} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Start
            <input
              type="date"
              value={draft.startDate}
              onChange={(event) => onChange({ ...draft, startDate: event.target.value })}
              aria-invalid={Boolean(errors.startDate)}
              aria-describedby={errors.startDate ? fieldErrorId(formId, "startDate") : undefined}
              className={inputClassName(Boolean(errors.startDate))}
            />
            <FieldError id={fieldErrorId(formId, "startDate")} message={errors.startDate} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Ende
            <input
              type="date"
              value={draft.endDate}
              onChange={(event) => onChange({ ...draft, endDate: event.target.value })}
              aria-invalid={Boolean(errors.endDate)}
              aria-describedby={errors.endDate ? fieldErrorId(formId, "endDate") : undefined}
              className={inputClassName(Boolean(errors.endDate))}
            />
            <FieldError id={fieldErrorId(formId, "endDate")} message={errors.endDate} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-black/70">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => onChange({ ...draft, isActive: event.target.checked })}
          />
          Aktives Semester
        </label>
        <button className="rounded-md bg-lake px-4 py-2 text-sm font-semibold text-white">
          {editing ? "Semester aktualisieren" : "Semester speichern"}
        </button>
      </div>
    </form>
  );
}

function GradeForm({
  draft,
  editing,
  errors,
  selectedSubjectId,
  subjects,
  terms,
  onCancel,
  onChange,
  onSubmit,
}: {
  draft: GradeDraft;
  editing: boolean;
  errors: FieldErrors<GradeFormField>;
  selectedSubjectId: string;
  subjects: DemoSubject[];
  terms: DemoTerm[];
  onCancel: () => void;
  onChange: (draft: GradeDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const formId = editing ? "demo-grade-edit" : "demo-grade-new";

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{editing ? "Note bearbeiten" : "Note erfassen"}</h2>
        {editing ? (
          <button type="button" onClick={onCancel} className="text-sm font-semibold text-black/60 hover:text-ink">
            Abbrechen
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Fach
          <select
            value={selectedSubjectId}
            onChange={(event) => onChange({ ...draft, subjectId: event.target.value })}
            disabled={subjects.length === 0}
            aria-invalid={Boolean(errors.subjectId)}
            aria-describedby={errors.subjectId ? fieldErrorId(formId, "subjectId") : undefined}
            className={inputClassName(Boolean(errors.subjectId))}
          >
            {subjects.length === 0 ? <option>Erst ein Fach erstellen</option> : null}
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
                {subject.archived ? " (archiviert)" : ""}
              </option>
            ))}
          </select>
          <FieldError id={fieldErrorId(formId, "subjectId")} message={errors.subjectId} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Semester
          <select
            value={draft.termId}
            onChange={(event) => onChange({ ...draft, termId: event.target.value })}
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
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? fieldErrorId(formId, "title") : undefined}
            className={inputClassName(Boolean(errors.title))}
          />
          <FieldError id={fieldErrorId(formId, "title")} message={errors.title} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Note
            <input
              value={draft.value}
              onChange={(event) => onChange({ ...draft, value: event.target.value })}
              inputMode="decimal"
              aria-invalid={Boolean(errors.gradeValue)}
              aria-describedby={errors.gradeValue ? fieldErrorId(formId, "gradeValue") : undefined}
              className={inputClassName(Boolean(errors.gradeValue))}
            />
            <FieldError id={fieldErrorId(formId, "gradeValue")} message={errors.gradeValue} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Gewicht
            <input
              value={draft.weight}
              onChange={(event) => onChange({ ...draft, weight: event.target.value })}
              inputMode="decimal"
              aria-invalid={Boolean(errors.weight)}
              aria-describedby={errors.weight ? fieldErrorId(formId, "weight") : undefined}
              className={inputClassName(Boolean(errors.weight))}
            />
            <FieldError id={fieldErrorId(formId, "weight")} message={errors.weight} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Datum
            <input
              type="date"
              value={draft.date}
              onChange={(event) => onChange({ ...draft, date: event.target.value })}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? fieldErrorId(formId, "date") : undefined}
              className={inputClassName(Boolean(errors.date))}
            />
            <FieldError id={fieldErrorId(formId, "date")} message={errors.date} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Typ
            <select
              value={draft.type}
              onChange={(event) => onChange({ ...draft, type: event.target.value as GradeType })}
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
            value={draft.notes}
            onChange={(event) => onChange({ ...draft, notes: event.target.value })}
            rows={3}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? fieldErrorId(formId, "notes") : undefined}
            className={inputClassName(Boolean(errors.notes), "resize-none")}
          />
          <FieldError id={fieldErrorId(formId, "notes")} message={errors.notes} />
        </label>
        <button
          disabled={subjects.length === 0}
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {editing ? "Note aktualisieren" : "Note speichern"}
        </button>
      </div>
    </form>
  );
}

function SubjectsPanel({
  summaries,
  onArchive,
  onDelete,
  onEdit,
}: {
  summaries: SubjectSummary[];
  onArchive: (subjectId: string) => void;
  onDelete: (subjectId: string) => void;
  onEdit: (subject: DemoSubject) => void;
}) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">Faecher</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {summaries.map((summary) => (
          <article key={summary.subject.id} className="rounded-md border border-black/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: summary.subject.color ?? DEFAULT_COLOR }}
                    aria-hidden
                  />
                  <h3 className="font-semibold text-ink">{summary.subject.name}</h3>
                </div>
                <p className="mt-1 text-xs uppercase tracking-wide text-black/45">
                  {summary.subject.archived ? "Archiviert" : subjectTypeLabel(summary.subject.subjectType)}
                </p>
              </div>
              <p className="text-2xl font-semibold text-ink">
                {summary.semesterGrade === null ? "-" : summary.semesterGrade.toFixed(1)}
              </p>
            </div>
            <p className="mt-3 text-sm text-black/60">
              {summary.gradeCount} Noten, exakt {summary.exactAverage === null ? "-" : summary.exactAverage.toFixed(2)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => onEdit(summary.subject)}
                className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-black/70 hover:border-black/30"
              >
                Bearbeiten
              </button>
              <button
                onClick={() => onArchive(summary.subject.id)}
                className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-black/70 hover:border-black/30"
              >
                {summary.subject.archived ? "Aktivieren" : "Archivieren"}
              </button>
              <button
                onClick={() => onDelete(summary.subject.id)}
                className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:border-red-300"
              >
                Loeschen
              </button>
            </div>
          </article>
        ))}
        {summaries.length === 0 ? <p className="text-sm text-black/60">Noch keine Faecher erfasst.</p> : null}
      </div>
    </section>
  );
}

function TermsPanel({
  terms,
  onDelete,
  onEdit,
  onToggleActive,
}: {
  terms: DemoTerm[];
  onDelete: (termId: string) => void;
  onEdit: (term: DemoTerm) => void;
  onToggleActive: (termId: string) => void;
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
            <div>
              <p className="font-semibold text-ink">{term.name}</p>
              <p className="text-sm text-black/60">
                {formatDate(term.startDate) || "Offen"} bis {formatDate(term.endDate) || "offen"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onEdit(term)}
                className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-black/70 hover:border-black/30"
              >
                Bearbeiten
              </button>
              <button
                onClick={() => onToggleActive(term.id)}
                className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-black/70 hover:border-black/30"
              >
                {term.isActive ? "Aktiv" : "Aktiv setzen"}
              </button>
              <button
                onClick={() => onDelete(term.id)}
                className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:border-red-300"
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
  subjects,
  terms,
  onDelete,
  onEdit,
}: {
  grades: DemoGrade[];
  subjects: DemoSubject[];
  terms: DemoTerm[];
  onDelete: (gradeId: string) => void;
  onEdit: (grade: DemoGrade) => void;
}) {
  const [filters, setFilters] = useState<GradeFilters>(DEFAULT_GRADE_FILTERS);
  const filteredGrades = useMemo(
    () => filterAndSortDemoGrades(grades, subjects, terms, filters),
    [filters, grades, subjects, terms],
  );
  const activeFilterLabels = useMemo(
    () => buildDemoActiveFilterLabels(filters, subjects, terms),
    [filters, subjects, terms],
  );

  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Noten</h2>
          <p className="text-sm text-black/60">Lokale Demo-Noten mit Fach und Semester.</p>
        </div>
      </div>
      <div className="mt-4">
        <ContextualRequiredGradePlanner
          description="Berechnet die naechste Note nur aus dem gewaehlten Demo-Fach und Semester."
          grades={buildDemoRequiredGradeContextGrades(grades)}
          subjects={buildDemoRequiredGradeSubjectOptions(subjects)}
          terms={buildDemoRequiredGradeTermOptions(terms)}
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
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
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
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
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
        {filteredGrades.map((grade) => {
          const subject = subjects.find((item) => item.id === grade.subjectId);
          const term = terms.find((item) => item.id === grade.termId);

          return (
            <div
              key={grade.id}
              className="grid gap-3 border-b border-black/10 p-4 last:border-b-0 md:grid-cols-[1fr_auto_auto]"
            >
              <div>
                <p className="font-semibold text-ink">{grade.title}</p>
                <p className="text-sm text-black/60">
                  {subject?.name ?? "Geloeschtes Fach"} / {term?.name ?? "kein Semester"} / {gradeTypeLabel(grade.type)}{" "}
                  / Gewicht {grade.weight}
                </p>
                {grade.date || grade.notes ? (
                  <p className="mt-1 text-xs text-black/45">
                    {formatDate(grade.date) ?? "Kein Datum"}
                    {grade.notes ? ` - ${grade.notes}` : ""}
                  </p>
                ) : null}
              </div>
              <p className="text-2xl font-semibold text-ink">{grade.value.toFixed(2)}</p>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  onClick={() => onEdit(grade)}
                  className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-black/70 hover:border-black/30"
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => onDelete(grade.id)}
                  className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:border-red-300"
                >
                  Loeschen
                </button>
              </div>
            </div>
          );
        })}
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
      <p className="mt-2 truncate text-2xl font-semibold text-ink">{value}</p>
    </article>
  );
}

type SubjectSummary = {
  subject: DemoSubject;
  gradeCount: number;
  exactAverage: number | null;
  semesterGrade: number | null;
};

function buildSubjectSummaries(subjects: DemoSubject[], grades: DemoGrade[]): SubjectSummary[] {
  return subjects.map((subject) => {
    const subjectGrades = grades.filter((grade) => grade.subjectId === subject.id);
    const items = subjectGrades.map((grade) => ({ value: grade.value, weight: grade.weight }));

    return {
      subject,
      gradeCount: subjectGrades.length,
      exactAverage: calculateWeightedAverage(items),
      semesterGrade: calculateSemesterGrade(items),
    };
  });
}

function upsertTerm(terms: DemoTerm[], term: DemoTerm, editingTermId: string | null): DemoTerm[] {
  const nextTerms = editingTermId
    ? terms.map((current) => (current.id === editingTermId ? term : current))
    : [term, ...terms];

  if (!term.isActive) return nextTerms;

  return nextTerms.map((current) => ({
    ...current,
    isActive: current.id === term.id,
  }));
}

function filterAndSortDemoGrades(
  grades: DemoGrade[],
  subjects: DemoSubject[],
  terms: DemoTerm[],
  filters: GradeFilters,
): DemoGrade[] {
  return grades
    .filter((grade) => matchesDemoGradeFilters(grade, filters))
    .sort((left, right) => {
      const compared = compareDemoGrades(left, right, subjects, terms, filters.sort);
      if (compared !== 0) return compared;
      return dateSortValue(right.date) - dateSortValue(left.date) || left.title.localeCompare(right.title);
    });
}

function matchesDemoGradeFilters(grade: DemoGrade, filters: GradeFilters): boolean {
  const search = filters.search.trim().toLowerCase();
  if (search && !`${grade.title} ${grade.notes ?? ""}`.toLowerCase().includes(search)) return false;
  if (filters.subjectId && grade.subjectId !== filters.subjectId) return false;
  if (filters.termId === NO_TERM_FILTER && grade.termId !== null) return false;
  if (filters.termId && filters.termId !== NO_TERM_FILTER && grade.termId !== filters.termId) return false;
  if (filters.type && grade.type !== filters.type) return false;
  if (filters.belowFourOnly && grade.value >= 4) return false;

  const gradeDate = grade.date ?? "";
  if (filters.dateFrom && (!gradeDate || gradeDate < filters.dateFrom)) return false;
  if (filters.dateTo && (!gradeDate || gradeDate > filters.dateTo)) return false;

  return true;
}

function compareDemoGrades(
  left: DemoGrade,
  right: DemoGrade,
  subjects: DemoSubject[],
  terms: DemoTerm[],
  sort: GradeSort,
): number {
  switch (sort) {
    case "date-asc":
      return dateSortValue(left.date) - dateSortValue(right.date);
    case "grade-desc":
      return right.value - left.value;
    case "grade-asc":
      return left.value - right.value;
    case "subject-asc":
      return demoSubjectLabel(left, subjects).localeCompare(demoSubjectLabel(right, subjects));
    case "subject-desc":
      return demoSubjectLabel(right, subjects).localeCompare(demoSubjectLabel(left, subjects));
    case "term-asc":
      return demoTermLabel(left, terms).localeCompare(demoTermLabel(right, terms));
    case "term-desc":
      return demoTermLabel(right, terms).localeCompare(demoTermLabel(left, terms));
    case "weight-desc":
      return right.weight - left.weight;
    case "weight-asc":
      return left.weight - right.weight;
    case "date-desc":
    default:
      return dateSortValue(right.date) - dateSortValue(left.date);
  }
}

function buildDemoActiveFilterLabels(filters: GradeFilters, subjects: DemoSubject[], terms: DemoTerm[]): string[] {
  const labels: string[] = [];
  const subject = subjects.find((item) => item.id === filters.subjectId);
  const term = terms.find((item) => item.id === filters.termId);
  const sort = GRADE_SORTS.find((item) => item.value === filters.sort);

  if (filters.search.trim()) labels.push(`Suche: ${filters.search.trim()}`);
  if (subject) labels.push(`Fach: ${subject.name}`);
  if (filters.termId === NO_TERM_FILTER) labels.push("Semester: keines");
  if (term) labels.push(`Semester: ${term.name}`);
  if (filters.type) labels.push(`Typ: ${gradeTypeLabel(filters.type as GradeType)}`);
  if (filters.dateFrom) labels.push(`Von: ${filters.dateFrom}`);
  if (filters.dateTo) labels.push(`Bis: ${filters.dateTo}`);
  if (filters.belowFourOnly) labels.push("Unter 4.0");
  if (sort && filters.sort !== DEFAULT_GRADE_FILTERS.sort) labels.push(`Sort: ${sort.label}`);

  return labels;
}

function buildDemoRequiredGradeSubjectOptions(subjects: DemoSubject[]) {
  return subjects
    .filter((subject) => !subject.archived)
    .map((subject) => ({
      id: subject.id,
      label: subject.shortName ? `${subject.shortName} - ${subject.name}` : subject.name,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function buildDemoRequiredGradeTermOptions(terms: DemoTerm[]) {
  return terms
    .map((term) => ({
      id: term.id,
      label: term.isActive ? `${term.name} (aktiv)` : term.name,
      isActive: term.isActive,
    }))
    .sort((left, right) => Number(right.isActive) - Number(left.isActive) || left.label.localeCompare(right.label));
}

function buildDemoRequiredGradeContextGrades(grades: DemoGrade[]) {
  return grades.map((grade) => ({
    subjectId: grade.subjectId,
    termId: grade.termId,
    value: grade.value,
    weight: grade.weight,
  }));
}

function buildDemoCsvGrades(grades: DemoGrade[]) {
  return grades.map((grade) => ({
    subjectId: grade.subjectId,
    termId: grade.termId,
    title: grade.title,
    value: grade.value,
    weight: grade.weight,
    date: grade.date,
    type: grade.type,
    notes: grade.notes,
  }));
}

function demoSubjectLabel(grade: DemoGrade, subjects: DemoSubject[]): string {
  return subjects.find((subject) => subject.id === grade.subjectId)?.name ?? "Geloeschtes Fach";
}

function demoTermLabel(grade: DemoGrade, terms: DemoTerm[]): string {
  return terms.find((term) => term.id === grade.termId)?.name ?? "kein Semester";
}

function dateSortValue(value: string | null): number {
  if (!value) return 0;
  return new Date(value).getTime();
}

function loadStoredState(): DemoState {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return cloneDemoState(demoSeed);

  try {
    return normalizeDemoState(JSON.parse(raw));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return cloneDemoState(demoSeed);
  }
}

function normalizeDemoState(value: unknown): DemoState {
  if (!isRecord(value)) return cloneDemoState(demoSeed);

  const subjects = Array.isArray(value.subjects)
    ? value.subjects.map(normalizeSubject).filter((subject): subject is DemoSubject => subject !== null)
    : [];
  const terms = Array.isArray(value.terms)
    ? value.terms.map(normalizeTerm).filter((term): term is DemoTerm => term !== null)
    : cloneDemoState(demoSeed).terms;
  const subjectIds = new Set(subjects.map((subject) => subject.id));
  const termIds = new Set(terms.map((term) => term.id));
  const grades = Array.isArray(value.grades)
    ? value.grades
        .map((grade) => normalizeGrade(grade, subjectIds, termIds))
        .filter((grade): grade is DemoGrade => grade !== null)
    : [];

  return {
    subjects: subjects.length > 0 ? subjects : cloneDemoState(demoSeed).subjects,
    terms,
    grades,
  };
}

function normalizeSubject(value: unknown): DemoSubject | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") return null;

  return {
    id: value.id,
    name: value.name,
    shortName: typeof value.shortName === "string" ? value.shortName : null,
    color: typeof value.color === "string" ? value.color : DEFAULT_COLOR,
    subjectType: isSubjectType(value.subjectType) ? value.subjectType : "regular",
    archived: typeof value.archived === "boolean" ? value.archived : false,
  };
}

function normalizeTerm(value: unknown): DemoTerm | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") return null;

  return {
    id: value.id,
    name: value.name,
    startDate: typeof value.startDate === "string" ? value.startDate : null,
    endDate: typeof value.endDate === "string" ? value.endDate : null,
    isActive: typeof value.isActive === "boolean" ? value.isActive : false,
  };
}

function normalizeGrade(value: unknown, subjectIds: Set<string>, termIds: Set<string>): DemoGrade | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.subjectId !== "string" ||
    typeof value.title !== "string" ||
    !subjectIds.has(value.subjectId)
  ) {
    return null;
  }

  const gradeValue = Number(value.value);
  const weight = Number(value.weight);
  if (!Number.isFinite(gradeValue) || !Number.isFinite(weight)) return null;

  const rawTermId = typeof value.termId === "string" && termIds.has(value.termId) ? value.termId : null;

  return {
    id: value.id,
    subjectId: value.subjectId,
    termId: rawTermId,
    title: value.title,
    value: gradeValue,
    weight,
    date: typeof value.date === "string" ? value.date : null,
    type: isGradeType(value.type) ? value.type : "other",
    notes: typeof value.notes === "string" ? value.notes : null,
  };
}

function cloneDemoState(state: DemoState): DemoState {
  return {
    subjects: state.subjects.map((subject) => ({ ...subject })),
    terms: state.terms.map((term) => ({ ...term })),
    grades: state.grades.map((grade) => ({ ...grade })),
  };
}

function subjectTypeLabel(value: SubjectType): string {
  return SUBJECT_TYPES.find((type) => type.value === value)?.label ?? value;
}

function gradeTypeLabel(value: GradeType): string {
  return GRADE_TYPES.find((type) => type.value === value)?.label ?? value;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("de-CH").format(new Date(value));
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSubjectType(value: unknown): value is SubjectType {
  return SUBJECT_TYPES.some((type) => type.value === value);
}

function isGradeType(value: unknown): value is GradeType {
  return GRADE_TYPES.some((type) => type.value === value);
}
