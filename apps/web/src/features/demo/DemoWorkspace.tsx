"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  calculateRequiredGrade,
  calculateSemesterGrade,
  calculateWeightedAverage,
  minimumExactAverageForRoundedHalf,
} from "@notenrechner/shared";

import { DemoGrade, DemoState, demoSeed } from "./demo-data";

const STORAGE_KEY = "notenrechner-v2-demo";

export function DemoWorkspace() {
  const [state, setState] = useState<DemoState>(() => {
    if (typeof window === "undefined") return demoSeed;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return demoSeed;

    try {
      return JSON.parse(raw) as DemoState;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return demoSeed;
    }
  });
  const [subjectId, setSubjectId] = useState(demoSeed.subjects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("4.5");
  const [weight, setWeight] = useState("1");
  const [targetRounded, setTargetRounded] = useState("4.5");
  const [upcomingWeight, setUpcomingWeight] = useState("1");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const subjectSummaries = useMemo(
    () =>
      state.subjects.map((subject) => {
        const grades = state.grades.filter((grade) => grade.subjectId === subject.id);
        const items = grades.map((grade) => ({ value: grade.value, weight: grade.weight }));
        return {
          subject,
          count: grades.length,
          exactAverage: calculateWeightedAverage(items),
          semesterGrade: calculateSemesterGrade(items),
        };
      }),
    [state],
  );

  const allItems = useMemo(
    () => state.grades.map((grade) => ({ value: grade.value, weight: grade.weight })),
    [state.grades],
  );
  const semesterGrade = calculateSemesterGrade(allItems);
  const exactAverage = calculateWeightedAverage(allItems);
  const belowFour = state.grades.filter((grade) => grade.value < 4);
  const requiredGrade = useMemo(() => {
    const parsedTarget = Number(targetRounded);
    const parsedUpcomingWeight = Number(upcomingWeight);

    if (!Number.isFinite(parsedTarget) || !Number.isFinite(parsedUpcomingWeight)) return null;

    try {
      return calculateRequiredGrade(allItems, parsedUpcomingWeight, minimumExactAverageForRoundedHalf(parsedTarget));
    } catch {
      return null;
    }
  }, [allItems, targetRounded, upcomingWeight]);

  function addGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedValue = Number(value);
    const parsedWeight = Number(weight);

    if (
      !subjectId ||
      !title.trim() ||
      !Number.isFinite(parsedValue) ||
      !Number.isFinite(parsedWeight) ||
      parsedValue < 1 ||
      parsedValue > 6 ||
      parsedWeight < 0
    ) {
      return;
    }

    const grade: DemoGrade = {
      id: crypto.randomUUID(),
      subjectId,
      title: title.trim(),
      value: parsedValue,
      weight: parsedWeight,
      date: new Date().toISOString().slice(0, 10),
    };

    setState((current) => ({
      ...current,
      grades: [grade, ...current.grades],
    }));
    setTitle("");
    setValue("4.5");
    setWeight("1");
  }

  function deleteGrade(id: string) {
    setState((current) => ({
      ...current,
      grades: current.grades.filter((grade) => grade.id !== id),
    }));
  }

  function resetDemo() {
    setState(demoSeed);
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7]">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
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
              className="rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-black/30"
            >
              Demo zuruecksetzen
            </button>
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
          Demo-Daten werden nur lokal in diesem Browser gespeichert. Erstelle einen Account, um Daten dauerhaft in der
          Datenbank zu sichern.
        </p>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <DashboardMetric label="Exakter Schnitt" value={exactAverage === null ? "-" : exactAverage.toFixed(2)} />
          <DashboardMetric label="Zeugnisnote" value={semesterGrade === null ? "-" : semesterGrade.toFixed(1)} />
          <DashboardMetric label="Noten unter 4.0" value={String(belowFour.length)} />
          <DashboardMetric label="Erfasste Noten" value={String(state.grades.length)} />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <form onSubmit={addGrade} className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-ink">Note erfassen</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-black/70">
                Fach
                <select
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  className="rounded-md border border-black/15 px-3 py-2"
                >
                  {state.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-black/70">
                Titel
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="z.B. LB02"
                  className="rounded-md border border-black/15 px-3 py-2"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm font-medium text-black/70">
                  Note
                  <input
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    inputMode="decimal"
                    className="rounded-md border border-black/15 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-black/70">
                  Gewicht
                  <input
                    value={weight}
                    onChange={(event) => setWeight(event.target.value)}
                    inputMode="decimal"
                    className="rounded-md border border-black/15 px-3 py-2"
                  />
                </label>
              </div>
              <button className="mt-2 rounded-md bg-alpine px-4 py-2 text-sm font-semibold text-white hover:bg-[#176653]">
                Note hinzufuegen
              </button>
            </div>
          </form>

          <div className="grid gap-4">
            <section className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
              <h2 className="text-lg font-semibold text-ink">Faecher</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {subjectSummaries.map((summary) => (
                  <article key={summary.subject.id} className="rounded-md border border-black/10 p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: summary.subject.color }}
                        aria-hidden
                      />
                      <h3 className="font-semibold text-ink">{summary.subject.name}</h3>
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-ink">
                      {summary.semesterGrade === null ? "-" : summary.semesterGrade.toFixed(1)}
                    </p>
                    <p className="text-sm text-black/60">
                      {summary.count} Noten, exakt{" "}
                      {summary.exactAverage === null ? "-" : summary.exactAverage.toFixed(2)}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Benoetigte Note</h2>
                  <p className="text-sm text-black/60">Berechnet auf Basis aller Demo-Noten.</p>
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
              <p className="mt-3 text-3xl font-semibold text-ink">
                {requiredGrade === null ? "-" : requiredGrade.toFixed(2)}
              </p>
            </section>

            <section className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
              <h2 className="text-lg font-semibold text-ink">Letzte Noten</h2>
              <div className="mt-3 overflow-hidden rounded-md border border-black/10">
                {state.grades.map((grade) => {
                  const subject = state.subjects.find((item) => item.id === grade.subjectId);
                  return (
                    <div
                      key={grade.id}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-black/10 px-4 py-3 last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-ink">{grade.title}</p>
                        <p className="text-sm text-black/60">
                          {subject?.name ?? "Fach"} / Gewicht {grade.weight}
                        </p>
                      </div>
                      <span className="font-semibold text-ink">{grade.value.toFixed(2)}</span>
                      <button
                        onClick={() => deleteGrade(grade.id)}
                        className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-black/70 hover:border-black/30"
                      >
                        Entfernen
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <p className="text-sm text-black/60">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
    </article>
  );
}
