"use client";

import { useMemo, useState } from "react";
import { calculateEfzResult } from "@notenrechner/shared";

import { CalculatorShell, ErrorNote, Field, ResultMetric } from "./CalculatorShell";
import { formatGrade, parseNumberList, parseOptionalGrade, statusLabel } from "./calculator-utils";

const FAILURE_LABELS: Record<string, string> = {
  incomplete: "Schulmodule, UeK-Module und IPA muessen erfasst sein.",
  erfahrungsnote_below_4: "Die Erfahrungsnote liegt unter 4.0.",
  ipa_below_4: "Die IPA liegt unter 4.0.",
};

export function EfzCalculator() {
  const [schoolModules, setSchoolModules] = useState("4.5 5.0 4.0 4.5 5.0");
  const [uekModules, setUekModules] = useState("5.0 4.5 5.0");
  const [ipaGrade, setIpaGrade] = useState("4.5");

  const parsed = useMemo(() => {
    const school = parseNumberList(schoolModules, "Schulmodule");
    if (school.error) return { error: school.error };

    const uek = parseNumberList(uekModules, "UeK-Module");
    if (uek.error) return { error: uek.error };

    const ipa = parseOptionalGrade(ipaGrade, "IPA");
    if (ipa.error) return { error: ipa.error };

    return {
      error: null,
      result: calculateEfzResult({
        schoolModules: school.values,
        uekModules: uek.values,
        ipaGrade: ipa.value,
      }),
    };
  }, [ipaGrade, schoolModules, uekModules]);

  const result = parsed.result;
  const statusTone = result?.passed === true ? "good" : result?.passed === false ? "bad" : "neutral";

  return (
    <CalculatorShell title="EFZ Rechner" eyebrow="Informatiker/in EFZ: Erfahrungsnote und IPA">
      <section className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
        <form className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-ink">EFZ Werte</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Schulmodule" hint="Alle Modulnoten, getrennt durch Leerzeichen, Komma oder Semikolon.">
              <textarea
                value={schoolModules}
                onChange={(event) => setSchoolModules(event.target.value)}
                rows={3}
                className="resize-none rounded-md border border-black/15 px-3 py-2"
              />
            </Field>
            <Field label="UeK-Module">
              <textarea
                value={uekModules}
                onChange={(event) => setUekModules(event.target.value)}
                rows={2}
                className="resize-none rounded-md border border-black/15 px-3 py-2"
              />
            </Field>
            <Field label="IPA">
              <input
                value={ipaGrade}
                onChange={(event) => setIpaGrade(event.target.value)}
                className="rounded-md border border-black/15 px-3 py-2"
              />
            </Field>
            <ErrorNote message={parsed.error ?? null} />
          </div>
        </form>

        <div className="grid gap-4 md:grid-cols-2">
          <ResultMetric label="Status" value={statusLabel(result?.passed ?? null)} tone={statusTone} />
          <ResultMetric label="Erfahrungsnote" value={formatGrade(result?.erfahrungsnote, 1)} />
          <ResultMetric label="Schul-Schnitt" value={formatGrade(result?.schoolAverage, 1)} />
          <ResultMetric label="UeK-Schnitt" value={formatGrade(result?.uekAverage, 1)} />
          <ResultMetric label="IPA" value={formatGrade(result?.ipaGrade, 1)} />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-black/10 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-ink">Diagnose</h2>
        {!parsed.error && result ? (
          <ul className="mt-3 grid gap-2 text-sm text-black/70">
            {(result.failedConditions.length === 0
              ? ["Alle EFZ-Kriterien sind erfuellt."]
              : result.failedConditions.map((condition) => FAILURE_LABELS[condition] ?? condition)
            ).map((message) => (
              <li key={message} className="rounded-md border border-black/10 px-3 py-2">
                {message}
              </li>
            ))}
          </ul>
        ) : (
          <ErrorNote message={parsed.error ?? null} />
        )}
      </section>
    </CalculatorShell>
  );
}
