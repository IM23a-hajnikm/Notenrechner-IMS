"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  calculateRequiredGrade,
  calculateSemesterGrade,
  calculateWeightedAverage,
  minimumExactAverageForRoundedHalf,
} from "@notenrechner/shared";

type PlannerVariant = "card" | "embedded";

export type RequiredGradeContextOption = {
  id: string;
  label: string;
  isActive?: boolean;
};

export type RequiredGradeContextGrade = {
  subjectId: string;
  termId: string | null;
  value: number;
  weight: number;
};

type RequiredGradePlannerProps = {
  description: string;
  grades: RequiredGradeContextGrade[];
  subjects: RequiredGradeContextOption[];
  terms: RequiredGradeContextOption[];
  title?: string;
  variant?: PlannerVariant;
};

type PlannerState =
  | {
      error: string;
      exactAverage: number | null;
      requiredGrade: null;
      scopedGrades: RequiredGradeContextGrade[];
      semesterGrade: number | null;
      targetExactAverage: number | null;
    }
  | {
      error: null;
      exactAverage: number | null;
      requiredGrade: number;
      scopedGrades: RequiredGradeContextGrade[];
      semesterGrade: number | null;
      targetExactAverage: number;
    };

const NO_TERM_CONTEXT = "__no-term";

export function ContextualRequiredGradePlanner({
  description,
  grades,
  subjects,
  terms,
  title = "Benoetigte Note planen",
  variant = "card",
}: RequiredGradePlannerProps) {
  const defaultSubjectId = subjects[0]?.id ?? "";
  const defaultTermId = terms.find((term) => term.isActive)?.id ?? terms[0]?.id ?? NO_TERM_CONTEXT;
  const [subjectId, setSubjectId] = useState(defaultSubjectId);
  const [termId, setTermId] = useState(defaultTermId);
  const [targetRounded, setTargetRounded] = useState("4.5");
  const [upcomingWeight, setUpcomingWeight] = useState("1");

  const termOptions = useMemo(() => [{ id: NO_TERM_CONTEXT, label: "Kein Semester" }, ...terms], [terms]);
  const selectedSubjectId = subjects.some((subject) => subject.id === subjectId) ? subjectId : defaultSubjectId;
  const selectedTermId = termOptions.some((term) => term.id === termId) ? termId : defaultTermId;
  const result = useMemo(
    () => calculatePlannerState(grades, selectedSubjectId, selectedTermId, targetRounded, upcomingWeight),
    [grades, selectedSubjectId, selectedTermId, targetRounded, upcomingWeight],
  );
  const status = describePlannerState(result);
  const isEmbedded = variant === "embedded";

  return (
    <section
      className={
        isEmbedded ? "border-y border-black/10 py-4" : "rounded-lg border border-black/10 bg-white p-5 shadow-soft"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="text-sm text-black/60">{description}</p>
        </div>
        <Link
          href="/calculators/required-grade"
          className="rounded-md border border-black/15 px-4 py-2 text-sm font-semibold text-ink hover:border-black/30"
        >
          Rechner oeffnen
        </Link>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-xs font-medium text-black/60">
          Fach
          <select
            value={selectedSubjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className="rounded-md border border-black/15 px-3 py-2 text-sm"
            disabled={subjects.length === 0}
          >
            {subjects.length === 0 ? <option value="">Kein Fach</option> : null}
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-black/60">
          Semester
          <select
            value={selectedTermId}
            onChange={(event) => setTermId(event.target.value)}
            className="rounded-md border border-black/15 px-3 py-2 text-sm"
          >
            {termOptions.map((term) => (
              <option key={term.id} value={term.id}>
                {term.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-black/60">
          Ziel-Zeugnisnote
          <input
            value={targetRounded}
            onChange={(event) => setTargetRounded(event.target.value)}
            className="rounded-md border border-black/15 px-3 py-2 text-sm"
            inputMode="decimal"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-black/60">
          Naechstes Gewicht
          <input
            value={upcomingWeight}
            onChange={(event) => setUpcomingWeight(event.target.value)}
            className="rounded-md border border-black/15 px-3 py-2 text-sm"
            inputMode="decimal"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlannerMetric label="Noten im Kontext" value={String(result.scopedGrades.length)} />
        <PlannerMetric label="Aktueller Schnitt" value={formatOptionalGrade(result.exactAverage, 2)} />
        <PlannerMetric label="Gerundete Note" value={formatOptionalGrade(result.semesterGrade, 1)} />
        <PlannerMetric label="Benoetigte Note" value={formatRequiredGrade(result.requiredGrade)} tone={status.tone} />
      </div>

      <p className={`mt-3 rounded-md border px-3 py-2 text-sm ${status.className}`}>{status.message}</p>
    </section>
  );
}

function calculatePlannerState(
  grades: RequiredGradeContextGrade[],
  subjectId: string,
  termId: string,
  targetRounded: string,
  upcomingWeight: string,
): PlannerState {
  const scopedGrades = grades.filter((grade) => {
    const gradeTermId = grade.termId ?? NO_TERM_CONTEXT;
    return grade.subjectId === subjectId && gradeTermId === termId;
  });
  const items = scopedGrades.map((grade) => ({ value: grade.value, weight: grade.weight }));
  let exactAverage: number | null = null;
  let semesterGrade: number | null = null;
  const target = Number(targetRounded);
  const nextWeight = Number(upcomingWeight);

  try {
    exactAverage = calculateWeightedAverage(items);
    semesterGrade = calculateSemesterGrade(items);
  } catch {
    return {
      error: "Mindestens eine Note oder Gewichtung im Kontext ist ungueltig.",
      exactAverage,
      requiredGrade: null,
      scopedGrades,
      semesterGrade,
      targetExactAverage: null,
    };
  }

  if (!subjectId) {
    return {
      error: "Erfasse zuerst ein Fach, damit die Planung einen Kontext hat.",
      exactAverage,
      requiredGrade: null,
      scopedGrades,
      semesterGrade,
      targetExactAverage: null,
    };
  }

  if (!Number.isFinite(target)) {
    return {
      error: "Zielnote muss eine gueltige Zahl sein.",
      exactAverage,
      requiredGrade: null,
      scopedGrades,
      semesterGrade,
      targetExactAverage: null,
    };
  }

  if (!Number.isFinite(nextWeight) || nextWeight <= 0) {
    return {
      error: "Das Gewicht der naechsten Note muss groesser als 0 sein.",
      exactAverage,
      requiredGrade: null,
      scopedGrades,
      semesterGrade,
      targetExactAverage: null,
    };
  }

  try {
    const targetExactAverage = minimumExactAverageForRoundedHalf(target);

    return {
      error: null,
      exactAverage,
      requiredGrade: calculateRequiredGrade(items, nextWeight, targetExactAverage) ?? targetExactAverage,
      scopedGrades,
      semesterGrade,
      targetExactAverage,
    };
  } catch {
    return {
      error: "Zielnote muss zwischen 1.0 und 6.0 liegen und auf 0.5 gerundet sein.",
      exactAverage,
      requiredGrade: null,
      scopedGrades,
      semesterGrade,
      targetExactAverage: null,
    };
  }
}

function describePlannerState(result: PlannerState): {
  className: string;
  message: string;
  tone: "default" | "good" | "bad";
} {
  if (result.error) {
    return {
      className: "border-red-200 bg-red-50 text-red-700",
      message: result.error,
      tone: "bad",
    };
  }

  if (result.requiredGrade === null) {
    return {
      className: "border-red-200 bg-red-50 text-red-700",
      message: "Berechnung fehlgeschlagen.",
      tone: "bad",
    };
  }

  const requiredGrade = result.requiredGrade;

  if (result.scopedGrades.length === 0) {
    return {
      className: "border-signal/25 bg-signal/10 text-black/70",
      message: `Noch keine Noten in diesem Fach/Semester. Die erste Note braucht mindestens ${requiredGrade.toFixed(2)}.`,
      tone: "default",
    };
  }

  if (requiredGrade <= 1) {
    return {
      className: "border-alpine/20 bg-alpine/10 text-alpine",
      message: "Ziel bereits abgesichert: Selbst die tiefste Schweizer Note reicht rechnerisch noch.",
      tone: "good",
    };
  }

  if (requiredGrade > 6) {
    return {
      className: "border-red-200 bg-red-50 text-red-700",
      message: `Mit dem gewaehlten Gewicht ist das Ziel nicht erreichbar; noetig waere ${requiredGrade.toFixed(2)}.`,
      tone: "bad",
    };
  }

  return {
    className: "border-black/10 bg-black/[0.02] text-black/70",
    message: `Fuer dieses Fach und Semester brauchst du mindestens ${requiredGrade.toFixed(2)} auf der naechsten Note.`,
    tone: "default",
  };
}

function PlannerMetric({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "good" | "bad";
  value: string;
}) {
  const valueClassName = tone === "good" ? "text-alpine" : tone === "bad" ? "text-red-700" : "text-ink";

  return (
    <div className="rounded-md border border-black/10 p-4">
      <p className="text-xs font-medium uppercase text-black/45">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueClassName}`}>{value}</p>
    </div>
  );
}

function formatRequiredGrade(value: number | null): string {
  if (value === null) return "-";
  if (value <= 1) return "<= 1.00";
  return value.toFixed(2);
}

function formatOptionalGrade(value: number | null, digits: number): string {
  return value === null ? "-" : value.toFixed(digits);
}
