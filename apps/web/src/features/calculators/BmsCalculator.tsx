"use client";

import { useMemo, useState } from "react";
import { calculateBmsResult } from "@notenrechner/shared";
import type { BmsSubjectInput, BmsSubjectKind } from "@notenrechner/shared";

import { CalculatorShell, ErrorNote, Field, ResultMetric } from "./CalculatorShell";
import { formatGrade, parseNumberList, parseOptionalGrade, statusLabel } from "./calculator-utils";

type BmsSubjectDraft = {
  id: string;
  name: string;
  kind: BmsSubjectKind;
  semesterGrades: string;
  examGrade: string;
  writtenExamGrade: string;
  oralExamGrade: string;
  idpaGrade: string;
  idafGrades: string;
};

const DEFAULT_SUBJECTS: BmsSubjectDraft[] = [
  bmsSubject("de", "Deutsch", "exam", "4.5 4.0 4.5 5.0", "", "4.5", "4.0"),
  bmsSubject("fr", "Franzoesisch", "exam", "4.0 4.5 4.5 4.0", "4.5"),
  bmsSubject("en", "Englisch", "exam", "5.0 4.5 5.0 4.5", "5.0"),
  bmsSubject("ma", "Mathematik", "exam", "4.0 4.5 4.0 4.5", "", "4.0", "4.5"),
  bmsSubject("fin", "Finanz- und Rechnungswesen", "exam", "4.5 4.5 5.0 4.5", "4.5"),
  bmsSubject("wr", "Wirtschaft und Recht", "non_exam", "4.0 4.5 4.5 5.0"),
  bmsSubject("gup", "Geschichte und Politik", "non_exam", "4.5 4.0 4.5"),
  bmsSubject("tup", "Technik und Umwelt", "non_exam", "5.0 4.5 4.5"),
  {
    ...bmsSubject("idpa", "IDPA / IDAF", "idpa_idaf"),
    idpaGrade: "4.5",
    idafGrades: "4.0 4.5",
  },
];

const FAILURE_LABELS: Record<string, string> = {
  incomplete: "Noch nicht alle Fachnoten sind berechenbar.",
  not_exactly_nine_fachnoten: "BMS braucht genau 9 Fachnoten.",
  overall_average_below_4: "Gesamtnote liegt unter 4.0.",
  too_many_insufficient_fachnoten: "Mehr als zwei Fachnoten sind unter 4.0.",
  total_deviation_above_2: "Die Abweichung unter 4.0 ist groesser als 2.0.",
};

export function BmsCalculator() {
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);

  const parsed = useMemo(() => parseSubjects(subjects), [subjects]);
  const result = parsed.error ? null : calculateBmsResult(parsed.subjects);
  const statusTone = result?.passed === true ? "good" : result?.passed === false ? "bad" : "neutral";

  function updateSubject(id: string, patch: Partial<BmsSubjectDraft>) {
    setSubjects((current) => current.map((subject) => (subject.id === id ? { ...subject, ...patch } : subject)));
  }

  return (
    <CalculatorShell title="BMS Rechner" eyebrow="Berufsmaturitaet: Fachnoten und Bestehensregeln">
      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <ResultMetric label="Status" value={statusLabel(result?.passed ?? null)} tone={statusTone} />
        <ResultMetric label="Gesamtnote" value={formatGrade(result?.overallAverage, 1)} />
        <ResultMetric label="Ungenuegende Fachnoten" value={result?.insufficientCount?.toString() ?? "-"} />
        <ResultMetric label="Abweichung unter 4.0" value={formatGrade(result?.totalDeviation, 1)} />
      </section>

      <section className="mt-6 rounded-lg border border-black/10 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">9 Fachnoten konfigurieren</h2>
            <p className="mt-1 text-sm leading-6 text-black/60">
              Semesterlisten verwenden bereits gerundete 0.5-Zeugnisnoten fuer Position 2.
            </p>
          </div>
          <button
            onClick={() => setSubjects(DEFAULT_SUBJECTS)}
            className="rounded-md border border-black/15 px-3 py-2 text-sm font-semibold text-black/70"
          >
            Beispiel laden
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {subjects.map((subject, index) => {
            const subjectResult = result?.subjects[index];

            return (
              <article key={subject.id} className="rounded-md border border-black/10 p-4">
                <div className="grid gap-3 lg:grid-cols-[1.1fr_180px_1.4fr_1fr]">
                  <Field label="Fach">
                    <input
                      value={subject.name}
                      onChange={(event) => updateSubject(subject.id, { name: event.target.value })}
                      className="rounded-md border border-black/15 px-3 py-2"
                    />
                  </Field>
                  <Field label="Typ">
                    <select
                      value={subject.kind}
                      onChange={(event) => updateSubject(subject.id, { kind: event.target.value as BmsSubjectKind })}
                      className="rounded-md border border-black/15 px-3 py-2"
                    >
                      <option value="exam">Pruefungsfach</option>
                      <option value="non_exam">Ohne Abschlusspruefung</option>
                      <option value="idpa_idaf">IDPA / IDAF</option>
                    </select>
                  </Field>
                  {subject.kind === "idpa_idaf" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="IDPA">
                        <input
                          value={subject.idpaGrade}
                          onChange={(event) => updateSubject(subject.id, { idpaGrade: event.target.value })}
                          className="rounded-md border border-black/15 px-3 py-2"
                        />
                      </Field>
                      <Field label="IDAF Noten">
                        <input
                          value={subject.idafGrades}
                          onChange={(event) => updateSubject(subject.id, { idafGrades: event.target.value })}
                          className="rounded-md border border-black/15 px-3 py-2"
                        />
                      </Field>
                    </div>
                  ) : (
                    <Field label="Semester-/Zeugnisnoten">
                      <input
                        value={subject.semesterGrades}
                        onChange={(event) => updateSubject(subject.id, { semesterGrades: event.target.value })}
                        className="rounded-md border border-black/15 px-3 py-2"
                      />
                    </Field>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <ResultPill label="P1" value={formatGrade(subjectResult?.position1, 1)} />
                    <ResultPill label="P2" value={formatGrade(subjectResult?.position2, 1)} />
                    <ResultPill label="Fachnote" value={formatGrade(subjectResult?.fachnote, 1)} strong />
                  </div>
                </div>

                {subject.kind === "exam" ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <Field label="Eine Pruefungsnote" hint="Optional; ueberschreibt schriftlich/muendlich.">
                      <input
                        value={subject.examGrade}
                        onChange={(event) => updateSubject(subject.id, { examGrade: event.target.value })}
                        className="rounded-md border border-black/15 px-3 py-2"
                      />
                    </Field>
                    <Field label="Schriftlich">
                      <input
                        value={subject.writtenExamGrade}
                        onChange={(event) => updateSubject(subject.id, { writtenExamGrade: event.target.value })}
                        className="rounded-md border border-black/15 px-3 py-2"
                      />
                    </Field>
                    <Field label="Muendlich">
                      <input
                        value={subject.oralExamGrade}
                        onChange={(event) => updateSubject(subject.id, { oralExamGrade: event.target.value })}
                        className="rounded-md border border-black/15 px-3 py-2"
                      />
                    </Field>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-black/10 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-ink">Diagnose</h2>
        <ErrorNote message={parsed.error} />
        {!parsed.error && result ? (
          <ul className="mt-3 grid gap-2 text-sm text-black/70">
            {(result.failedConditions.length === 0
              ? ["Alle BMS-Kriterien sind erfuellt."]
              : result.failedConditions.map((condition) => FAILURE_LABELS[condition] ?? condition)
            ).map((message) => (
              <li key={message} className="rounded-md border border-black/10 px-3 py-2">
                {message}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </CalculatorShell>
  );
}

function ResultPill({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-md border border-black/10 bg-[#f6f8f7] px-3 py-2">
      <p className="text-xs text-black/50">{label}</p>
      <p className={`${strong ? "text-lg" : "text-base"} font-semibold text-ink`}>{value}</p>
    </div>
  );
}

function parseSubjects(subjects: BmsSubjectDraft[]): { subjects: BmsSubjectInput[]; error: string | null } {
  const parsedSubjects: BmsSubjectInput[] = [];

  for (const subject of subjects) {
    if (!subject.name.trim()) return { subjects: [], error: "Alle BMS-Faecher brauchen einen Namen." };

    if (subject.kind === "idpa_idaf") {
      const idpa = parseOptionalGrade(subject.idpaGrade, `${subject.name} IDPA`);
      if (idpa.error) return { subjects: [], error: idpa.error };

      const idafGrades = parseNumberList(subject.idafGrades, `${subject.name} IDAF`);
      if (idafGrades.error) return { subjects: [], error: idafGrades.error };

      parsedSubjects.push({
        id: subject.id,
        name: subject.name.trim(),
        kind: "idpa_idaf",
        ...(idpa.value !== null ? { idpaGrade: idpa.value } : {}),
        idafGrades: idafGrades.values,
      });
      continue;
    }

    const semesterGrades = parseNumberList(subject.semesterGrades, `${subject.name} Semester`);
    if (semesterGrades.error) return { subjects: [], error: semesterGrades.error };

    if (subject.kind === "non_exam") {
      parsedSubjects.push({
        id: subject.id,
        name: subject.name.trim(),
        kind: "non_exam",
        semesterGrades: semesterGrades.values,
      });
      continue;
    }

    const examGrade = parseOptionalGrade(subject.examGrade, `${subject.name} Pruefungsnote`);
    if (examGrade.error) return { subjects: [], error: examGrade.error };

    const writtenExamGrade = parseOptionalGrade(subject.writtenExamGrade, `${subject.name} schriftlich`);
    if (writtenExamGrade.error) return { subjects: [], error: writtenExamGrade.error };

    const oralExamGrade = parseOptionalGrade(subject.oralExamGrade, `${subject.name} muendlich`);
    if (oralExamGrade.error) return { subjects: [], error: oralExamGrade.error };

    parsedSubjects.push({
      id: subject.id,
      name: subject.name.trim(),
      kind: "exam",
      semesterGrades: semesterGrades.values,
      ...(examGrade.value !== null ? { examGrade: examGrade.value } : {}),
      ...(writtenExamGrade.value !== null ? { writtenExamGrade: writtenExamGrade.value } : {}),
      ...(oralExamGrade.value !== null ? { oralExamGrade: oralExamGrade.value } : {}),
    });
  }

  return { subjects: parsedSubjects, error: null };
}

function bmsSubject(
  id: string,
  name: string,
  kind: BmsSubjectKind,
  semesterGrades = "",
  examGrade = "",
  writtenExamGrade = "",
  oralExamGrade = "",
): BmsSubjectDraft {
  return {
    id,
    name,
    kind,
    semesterGrades,
    examGrade,
    writtenExamGrade,
    oralExamGrade,
    idpaGrade: "",
    idafGrades: "",
  };
}
