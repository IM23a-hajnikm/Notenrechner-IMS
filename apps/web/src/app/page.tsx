import Link from "next/link";
import { calculateBmsResult, calculateEfzResult, calculateSemesterGrade } from "@notenrechner/shared";

import { ThemeToggle } from "../features/theme/ThemeToggle";

const demoSemesterGrade = calculateSemesterGrade([
  { value: 5, weight: 1 },
  { value: 4.25, weight: 2 },
]);

const demoBms = calculateBmsResult(
  [4.5, 4, 4.5, 5, 4, 4.5, 4.5, 5, 4].map((fachnote, index) => ({
    name: `Fach ${index + 1}`,
    kind: "non_exam",
    semesterGrades: [fachnote],
  })),
);

const demoEfz = calculateEfzResult({
  schoolModules: [4.5, 5, 4, 4.5],
  uekModules: [5, 5],
  ipaGrade: 4.5,
});

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8">
        <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-alpine">Notenrechner v2</p>
            <p className="text-sm text-black/60">Swiss grade calculator for students</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ThemeToggle />
            <Link
              href="/account/login"
              className="rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-black/30"
            >
              Einloggen
            </Link>
            <Link
              href="/calculators"
              className="rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-black/30"
            >
              Rechner
            </Link>
            <Link
              href="/demo"
              className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
            >
              Demo starten
            </Link>
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Noten planen, bevor das Zeugnis ueberrascht.
            </h1>
            <p className="mt-5 text-lg leading-8 text-black/70">
              Erfasse Pruefungen mit Gewichtung, sieh die offizielle 0.5-Rundung und pruefe BMS- oder EFZ-Bedingungen
              mit klaren Diagnosen.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className="rounded-md bg-alpine px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#176653]"
              >
                Ohne Login testen
              </Link>
              <Link
                href="/account/register"
                className="rounded-md border border-black/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-black/30"
              >
                Account erstellen
              </Link>
              <Link
                href="/calculators/bms"
                className="rounded-md border border-black/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-black/30"
              >
                BMS pruefen
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            <Metric label="Semesterzeugnis" value={demoSemesterGrade?.toFixed(1) ?? "-"} tone="green" />
            <Metric label="BMS Gesamtnote" value={demoBms.overallAverage?.toFixed(1) ?? "-"} tone="blue" />
            <Metric label="EFZ Erfahrungsnote" value={demoEfz.erfahrungsnote?.toFixed(1) ?? "-"} tone="amber" />
          </div>
        </div>

        <section id="account-mode" className="grid gap-4 pb-10 md:grid-cols-3">
          <Feature
            title="Gewichtete Noten"
            body="Pruefungen, Module und Projekte koennen unterschiedliche Gewichte haben."
          />
          <Feature title="BMS und EFZ" body="Pass/fail-Diagnosen zeigen, welche Bedingung noch kritisch ist." />
          <Feature
            title="Account-Modus"
            body="Registrierung und Login speichern Faecher, Semester und Noten persistent im Backend."
          />
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "green" | "blue" | "amber" }) {
  const tones = {
    green: "border-alpine/25 bg-alpine/10 text-alpine",
    blue: "border-lake/25 bg-lake/10 text-lake",
    amber: "border-signal/25 bg-signal/10 text-signal",
  };

  return (
    <div className={`rounded-lg border p-5 ${tones[tone]}`}>
      <p className="text-sm font-medium text-black/60">{label}</p>
      <p className="mt-2 text-4xl font-semibold">{value}</p>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-black/65">{body}</p>
    </article>
  );
}
