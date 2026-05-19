import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "../theme/ThemeToggle";

const links = [
  { href: "/calculators/required-grade", label: "Benoetigte Note" },
  { href: "/calculators/bms", label: "BMS" },
  { href: "/calculators/efz", label: "EFZ" },
];

export function CalculatorShell({ children, title, eyebrow }: { children: ReactNode; title: string; eyebrow: string }) {
  return (
    <main className="min-h-screen bg-[#f6f8f7]">
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
        <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
          <div>
            <Link href="/" className="text-sm font-semibold uppercase tracking-wide text-alpine">
              Notenrechner v2
            </Link>
            <p className="mt-1 text-sm text-black/60">{eyebrow}</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">{title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <ThemeToggle />
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-ink hover:border-black/30"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
        {children}
      </div>
    </main>
  );
}

export function ResultMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const tones = {
    neutral: "border-black/10 bg-white text-ink",
    good: "border-alpine/25 bg-alpine/10 text-alpine",
    bad: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <article className={`rounded-lg border p-5 shadow-soft ${tones[tone]}`}>
      <p className="text-sm text-black/60">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </article>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-black/70">
      {label}
      {children}
      {hint ? <span className="text-xs font-normal leading-5 text-black/45">{hint}</span> : null}
    </label>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  return message ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null;
}
