"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  calculateRequiredGrade,
  calculateSemesterGrade,
  calculateWeightedAverage,
  minimumExactAverageForRoundedHalf,
} from "@notenrechner/shared";

import { CalculatorShell, ErrorNote, Field, ResultMetric } from "./CalculatorShell";
import { formatGrade, parseNumberList, parsePositiveNumber } from "./calculator-utils";

export function RequiredGradeCalculator() {
  const [gradesInput, setGradesInput] = useState("4.5 5.0 3.75");
  const [weightsInput, setWeightsInput] = useState("1 2 1");
  const [targetRounded, setTargetRounded] = useState("4.5");
  const [upcomingWeight, setUpcomingWeight] = useState("1");

  const result = useMemo(() => {
    const grades = parseNumberList(gradesInput, "Noten");
    if (grades.error) return { error: grades.error };

    const weights = parseNumberList(weightsInput, "Gewichte");
    if (weights.error) return { error: weights.error };

    if (weights.values.length !== 0 && weights.values.length !== grades.values.length) {
      return { error: "Wenn Gewichte angegeben sind, braucht jede Note genau ein Gewicht." };
    }

    const upcoming = parsePositiveNumber(upcomingWeight, "Gewicht der naechsten Note");
    if (upcoming.error || upcoming.value === null) return { error: upcoming.error };

    const target = Number(targetRounded);
    if (!Number.isFinite(target)) return { error: "Zielnote muss eine gueltige Zahl sein." };

    try {
      const targetExactAverage = minimumExactAverageForRoundedHalf(target);
      const items = grades.values.map((value, index) => ({
        value,
        weight: weights.values[index] ?? 1,
      }));
      return {
        error: null,
        exactAverage: calculateWeightedAverage(items),
        semesterGrade: calculateSemesterGrade(items),
        targetExactAverage,
        requiredGrade: calculateRequiredGrade(items, upcoming.value, targetExactAverage),
      };
    } catch (caught) {
      return { error: caught instanceof Error ? caught.message : "Berechnung fehlgeschlagen." };
    }
  }, [gradesInput, targetRounded, upcomingWeight, weightsInput]);

  function handleTargetClick(event: FormEvent<HTMLButtonElement>, value: string) {
    event.preventDefault();
    setTargetRounded(value);
  }

  return (
    <CalculatorShell title="Benoetigte Note" eyebrow="Planung fuer die naechste Pruefung">
      <section className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
        <form className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-ink">Aktuelle Situation</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Bisherige Noten" hint="Leerzeichen, Kommas oder Semikolons sind erlaubt.">
              <input
                value={gradesInput}
                onChange={(event) => setGradesInput(event.target.value)}
                className="rounded-md border border-black/15 px-3 py-2"
              />
            </Field>
            <Field label="Gewichte" hint="Optional. Leer lassen fuer Gewicht 1 pro Note.">
              <input
                value={weightsInput}
                onChange={(event) => setWeightsInput(event.target.value)}
                className="rounded-md border border-black/15 px-3 py-2"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ziel-Zeugnisnote">
                <input
                  value={targetRounded}
                  onChange={(event) => setTargetRounded(event.target.value)}
                  className="rounded-md border border-black/15 px-3 py-2"
                />
              </Field>
              <Field label="Naechstes Gewicht">
                <input
                  value={upcomingWeight}
                  onChange={(event) => setUpcomingWeight(event.target.value)}
                  className="rounded-md border border-black/15 px-3 py-2"
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              {["4.0", "4.5", "5.0", "5.5"].map((value) => (
                <button
                  key={value}
                  onClick={(event) => handleTargetClick(event, value)}
                  className="rounded-md border border-black/15 px-3 py-1 text-sm font-semibold text-black/70"
                >
                  Ziel {value}
                </button>
              ))}
            </div>
            <ErrorNote message={result.error ?? null} />
          </div>
        </form>

        <div className="grid gap-4 md:grid-cols-2">
          <ResultMetric label="Exakter Schnitt" value={formatGrade(result.exactAverage, 2)} />
          <ResultMetric label="Zeugnisnote" value={formatGrade(result.semesterGrade, 1)} />
          <ResultMetric label="Mindest-Schnitt fuer Ziel" value={formatGrade(result.targetExactAverage, 2)} />
          <ResultMetric
            label="Benoetigte Note"
            value={formatGrade(result.requiredGrade, 2)}
            tone={
              result.requiredGrade !== undefined && result.requiredGrade !== null && result.requiredGrade <= 6
                ? "good"
                : "bad"
            }
          />
        </div>
      </section>
    </CalculatorShell>
  );
}
