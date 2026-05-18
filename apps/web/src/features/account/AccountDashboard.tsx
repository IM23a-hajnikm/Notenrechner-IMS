"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  calculateRequiredGrade,
  calculateSemesterGrade,
  calculateWeightedAverage,
  minimumExactAverageForRoundedHalf,
} from "@notenrechner/shared";

import {
  AccountGrade,
  AccountSnapshot,
  AccountSubject,
  AccountTerm,
  GradeType,
  SubjectType,
  createGrade,
  createSubject,
  createTerm,
  deleteGrade,
  deleteSubject,
  deleteTerm,
  loadAccountSnapshot,
  logoutAccount,
  updateSubject,
  updateTerm,
} from "./api-client";

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

const ACCOUNT_VIEWS: { value: AccountView; label: string; description: string }[] = [
  { value: "dashboard", label: "Dashboard", description: "Ueberblick" },
  { value: "subjects", label: "Faecher", description: "Struktur" },
  { value: "terms", label: "Semester", description: "Zeitraeume" },
  { value: "grades", label: "Noten", description: "Erfassung" },
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

  async function mutate(action: () => Promise<unknown>) {
    setError(null);
    setIsMutating(true);

    try {
      await action();
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Die Aktion konnte nicht gespeichert werden.");
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
      <main className="min-h-screen bg-[#f6f8f7]">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-5">
          <p className="rounded-md border border-black/10 bg-white px-4 py-3 text-sm text-black/70 shadow-soft">
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
            <p className="mt-2 text-sm leading-6 text-black/60">
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
    <main className="min-h-screen bg-[#f6f8f7]">
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
        <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
          <div>
            <Link href="/" className="text-sm font-semibold uppercase tracking-wide text-alpine">
              Notenrechner v2
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Account-Modus</h1>
            <p className="text-sm text-black/60">{snapshot.user.email}</p>
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

        {error ? <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <AccountViewNav currentView={currentView} onChange={setCurrentView} snapshot={snapshot} />

        {currentView === "dashboard" ? (
          <DashboardView
            disabled={isMutating}
            snapshot={snapshot}
            onCreateGrade={(input) => mutate(() => createGrade(input))}
          />
        ) : null}

        {currentView === "subjects" ? (
          <SubjectsView
            disabled={isMutating}
            snapshot={snapshot}
            onArchive={(subject) => mutate(() => updateSubject(subject.id, { archived: !subject.archived }))}
            onCreateSubject={(input) => mutate(() => createSubject(input))}
            onDelete={(subject) => mutate(() => deleteSubject(subject.id))}
          />
        ) : null}

        {currentView === "terms" ? (
          <TermsView
            disabled={isMutating}
            snapshot={snapshot}
            onCreateTerm={(input) => mutate(() => createTerm(input))}
            onDelete={(term) => mutate(() => deleteTerm(term.id))}
            onToggleActive={(term) => mutate(() => updateTerm(term.id, { isActive: !term.isActive }))}
          />
        ) : null}

        {currentView === "grades" ? (
          <GradesView
            disabled={isMutating}
            snapshot={snapshot}
            onCreateGrade={(input) => mutate(() => createGrade(input))}
            onDelete={(grade) => mutate(() => deleteGrade(grade.id))}
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
}: {
  disabled: boolean;
  snapshot: AccountSnapshot;
  onCreateGrade: (input: CreateGradeInput) => void;
}) {
  return (
    <>
      <AccountSummary snapshot={snapshot} />
      <section className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
        <GradeForm
          disabled={disabled}
          subjects={snapshot.subjects.filter((subject) => !subject.archived)}
          terms={snapshot.terms}
          onSubmit={onCreateGrade}
        />
        <div className="grid gap-4">
          <RequiredGradeShortcut snapshot={snapshot} />
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
}: {
  disabled: boolean;
  snapshot: AccountSnapshot;
  onArchive: (subject: AccountSubject) => void;
  onCreateSubject: (input: CreateSubjectInput) => void;
  onDelete: (subject: AccountSubject) => void;
}) {
  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
      <SubjectForm disabled={disabled} onSubmit={onCreateSubject} />
      <SubjectsPanel
        subjects={snapshot.subjects}
        grades={snapshot.grades}
        disabled={disabled}
        onArchive={onArchive}
        onDelete={onDelete}
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
}: {
  disabled: boolean;
  snapshot: AccountSnapshot;
  onCreateTerm: (input: CreateTermInput) => void;
  onDelete: (term: AccountTerm) => void;
  onToggleActive: (term: AccountTerm) => void;
}) {
  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
      <TermForm disabled={disabled} onSubmit={onCreateTerm} />
      <TermsPanel terms={snapshot.terms} disabled={disabled} onDelete={onDelete} onToggleActive={onToggleActive} />
    </section>
  );
}

function GradesView({
  disabled,
  snapshot,
  onCreateGrade,
  onDelete,
}: {
  disabled: boolean;
  snapshot: AccountSnapshot;
  onCreateGrade: (input: CreateGradeInput) => void;
  onDelete: (grade: AccountGrade) => void;
}) {
  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
      <GradeForm
        disabled={disabled}
        subjects={snapshot.subjects.filter((subject) => !subject.archived)}
        terms={snapshot.terms}
        onSubmit={onCreateGrade}
      />
      <GradesPanel grades={snapshot.grades} disabled={disabled} onDelete={onDelete} />
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
  const items = snapshot.grades.map((grade) => ({ value: gradeValue(grade), weight: gradeWeight(grade) }));
  const exactAverage = calculateWeightedAverage(items);
  const semesterGrade = calculateSemesterGrade(items);

  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Benoetigte Note planen</h2>
          <p className="text-sm text-black/60">Starte mit deinem aktuellen Account-Schnitt.</p>
        </div>
        <Link
          href="/calculators/required-grade"
          className="rounded-md border border-black/15 px-4 py-2 text-sm font-semibold text-ink hover:border-black/30"
        >
          Rechner oeffnen
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-black/10 p-4">
          <p className="text-sm text-black/60">Aktueller Schnitt</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {exactAverage === null ? "-" : exactAverage.toFixed(2)}
          </p>
        </div>
        <div className="rounded-md border border-black/10 p-4">
          <p className="text-sm text-black/60">Gerundete Note</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {semesterGrade === null ? "-" : semesterGrade.toFixed(1)}
          </p>
        </div>
      </div>
    </section>
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
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (input: { name: string; shortName?: string; color?: string; subjectType?: SubjectType }) => void;
}) {
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [color, setColor] = useState("#1f7a68");
  const [subjectType, setSubjectType] = useState<SubjectType>("regular");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      ...(shortName.trim() ? { shortName: shortName.trim() } : {}),
      color,
      subjectType,
    });
    setName("");
    setShortName("");
    setSubjectType("regular");
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">Fach erfassen</h2>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-[1fr_64px] gap-3">
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Kurzname
            <input
              value={shortName}
              onChange={(event) => setShortName(event.target.value)}
              className="rounded-md border border-black/15 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Farbe
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-10 rounded-md border border-black/15 bg-white px-1 py-1"
            />
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
        <button
          disabled={disabled}
          className="rounded-md bg-alpine px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Fach speichern
        </button>
      </div>
    </form>
  );
}

function TermForm({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (input: { name: string; startDate?: string | null; endDate?: string | null; isActive?: boolean }) => void;
}) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      isActive,
    });
    setName("");
    setStartDate("");
    setEndDate("");
    setIsActive(false);
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">Semester erfassen</h2>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z.B. 3. Semester"
            required
            className="rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Start
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-md border border-black/15 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Ende
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-md border border-black/15 px-3 py-2"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-black/70">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          Aktives Semester
        </label>
        <button
          disabled={disabled}
          className="rounded-md bg-lake px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Semester speichern
        </button>
      </div>
    </form>
  );
}

function GradeForm({
  disabled,
  subjects,
  terms,
  onSubmit,
}: {
  disabled: boolean;
  subjects: AccountSubject[];
  terms: AccountTerm[];
  onSubmit: (input: {
    subjectId: string;
    termId?: string | null;
    title: string;
    gradeValue: number;
    weight?: number;
    date?: string | null;
    type?: GradeType;
    notes?: string | null;
  }) => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [title, setTitle] = useState("");
  const [gradeValueInput, setGradeValueInput] = useState("4.5");
  const [weightInput, setWeightInput] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<GradeType>("exam");
  const [notes, setNotes] = useState("");

  const selectedSubjectId = subjectId || subjects[0]?.id || "";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedGrade = Number(gradeValueInput);
    const parsedWeight = Number(weightInput);

    if (
      !selectedSubjectId ||
      !title.trim() ||
      !Number.isFinite(parsedGrade) ||
      !Number.isFinite(parsedWeight) ||
      parsedGrade < 1 ||
      parsedGrade > 6 ||
      parsedWeight < 0
    ) {
      return;
    }

    onSubmit({
      subjectId: selectedSubjectId,
      termId: termId || null,
      title: title.trim(),
      gradeValue: parsedGrade,
      weight: parsedWeight,
      date: date || null,
      type,
      notes: notes.trim() || null,
    });
    setTitle("");
    setGradeValueInput("4.5");
    setWeightInput("1");
    setNotes("");
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">Note erfassen</h2>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-black/70">
          Fach
          <select
            value={selectedSubjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            disabled={subjects.length === 0}
            className="rounded-md border border-black/15 px-3 py-2"
          >
            {subjects.length === 0 ? <option>Erst ein Fach erstellen</option> : null}
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
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
            required
            className="rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Note
            <input
              value={gradeValueInput}
              onChange={(event) => setGradeValueInput(event.target.value)}
              inputMode="decimal"
              required
              className="rounded-md border border-black/15 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Gewicht
            <input
              value={weightInput}
              onChange={(event) => setWeightInput(event.target.value)}
              inputMode="decimal"
              required
              className="rounded-md border border-black/15 px-3 py-2"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium text-black/70">
            Datum
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-md border border-black/15 px-3 py-2"
            />
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
            className="resize-none rounded-md border border-black/15 px-3 py-2"
          />
        </label>
        <button
          disabled={disabled || subjects.length === 0}
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Note speichern
        </button>
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
}: {
  subjects: AccountSubject[];
  grades: AccountGrade[];
  disabled: boolean;
  onArchive: (subject: AccountSubject) => void;
  onDelete: (subject: AccountSubject) => void;
}) {
  const summaries = buildSubjectSummaries(subjects, grades);

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
                    style={{ backgroundColor: summary.subject.color ?? "#1f7a68" }}
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
                disabled={disabled}
                onClick={() => onArchive(summary.subject)}
                className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-black/70 disabled:opacity-60"
              >
                {summary.subject.archived ? "Aktivieren" : "Archivieren"}
              </button>
              <button
                disabled={disabled}
                onClick={() => onDelete(summary.subject)}
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
  onToggleActive,
  onDelete,
}: {
  terms: AccountTerm[];
  disabled: boolean;
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
            <div>
              <p className="font-semibold text-ink">{term.name}</p>
              <p className="text-sm text-black/60">
                {formatDate(term.startDate) || "Offen"} bis {formatDate(term.endDate) || "offen"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={disabled}
                onClick={() => onToggleActive(term)}
                className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-black/70 disabled:opacity-60"
              >
                {term.isActive ? "Aktiv" : "Aktiv setzen"}
              </button>
              <button
                disabled={disabled}
                onClick={() => onDelete(term)}
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
  onDelete,
}: {
  grades: AccountGrade[];
  disabled: boolean;
  onDelete: (grade: AccountGrade) => void;
}) {
  const [targetRounded, setTargetRounded] = useState("4.5");
  const [upcomingWeight, setUpcomingWeight] = useState("1");
  const items = useMemo(
    () => grades.map((grade) => ({ value: gradeValue(grade), weight: gradeWeight(grade) })),
    [grades],
  );
  const requiredGrade = useMemo(() => {
    const parsedTarget = Number(targetRounded);
    const parsedUpcomingWeight = Number(upcomingWeight);
    if (!Number.isFinite(parsedTarget) || !Number.isFinite(parsedUpcomingWeight)) return null;

    try {
      return calculateRequiredGrade(items, parsedUpcomingWeight, minimumExactAverageForRoundedHalf(parsedTarget));
    } catch {
      return null;
    }
  }, [items, targetRounded, upcomingWeight]);

  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Noten</h2>
          <p className="text-sm text-black/60">Persistente Daten aus dem Account.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs font-medium text-black/60">
            Ziel
            <input
              value={targetRounded}
              onChange={(event) => setTargetRounded(event.target.value)}
              className="w-24 rounded-md border border-black/15 px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-black/60">
            Gewicht
            <input
              value={upcomingWeight}
              onChange={(event) => setUpcomingWeight(event.target.value)}
              className="w-24 rounded-md border border-black/15 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>
      <p className="mt-3 text-sm text-black/60">
        Benoetigte Note:{" "}
        <span className="text-lg font-semibold text-ink">
          {requiredGrade === null ? "-" : requiredGrade.toFixed(2)}
        </span>
      </p>
      <div className="mt-4 overflow-hidden rounded-md border border-black/10">
        {grades.map((grade) => (
          <div
            key={grade.id}
            className="grid gap-3 border-b border-black/10 p-4 last:border-b-0 md:grid-cols-[1fr_auto_auto]"
          >
            <div>
              <p className="font-semibold text-ink">{grade.title}</p>
              <p className="text-sm text-black/60">
                {grade.subject.name} / {grade.term?.name ?? "kein Semester"} / Gewicht {gradeWeight(grade)}
              </p>
            </div>
            <p className="text-2xl font-semibold text-ink">{gradeValue(grade).toFixed(2)}</p>
            <button
              disabled={disabled}
              onClick={() => onDelete(grade)}
              className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 disabled:opacity-60"
            >
              Loeschen
            </button>
          </div>
        ))}
        {grades.length === 0 ? <p className="p-4 text-sm text-black/60">Noch keine Noten erfasst.</p> : null}
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

function subjectTypeLabel(value: SubjectType): string {
  return SUBJECT_TYPES.find((type) => type.value === value)?.label ?? value;
}

function parseAccountView(value: string | null): AccountView {
  if (value === "subjects" || value === "terms" || value === "grades") return value;
  return "dashboard";
}
