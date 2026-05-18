"use client";

import Link from "next/link";

import type { SavedBmsStatus, SavedCertificationStatus, SavedEfzStatus } from "./saved-data-status";

const BMS_FAILURE_LABELS: Record<string, string> = {
  incomplete: "Noch nicht alle Fachnoten sind berechenbar.",
  not_exactly_nine_fachnoten: "BMS braucht genau 9 Fachnoten.",
  overall_average_below_4: "Gesamtnote liegt unter 4.0.",
  too_many_insufficient_fachnoten: "Mehr als zwei Fachnoten sind unter 4.0.",
  total_deviation_above_2: "Die Abweichung unter 4.0 ist groesser als 2.0.",
};

const EFZ_FAILURE_LABELS: Record<string, string> = {
  incomplete: "Schulmodule, UeK-Module und IPA muessen erfasst sein.",
  erfahrungsnote_below_4: "Die Erfahrungsnote liegt unter 4.0.",
  ipa_below_4: "Die IPA liegt unter 4.0.",
};

export function CertificationStatusCards({ status }: { status: SavedCertificationStatus }) {
  if (!status.bms.isRelevant && !status.efz.isRelevant) return null;

  return (
    <section className="mt-6 grid gap-4 lg:grid-cols-2">
      {status.bms.isRelevant ? <BmsStatusCard status={status.bms} /> : null}
      {status.efz.isRelevant ? <EfzStatusCard status={status.efz} /> : null}
    </section>
  );
}

export function CertificationInputGuide() {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-ink">BMS / EFZ Daten</h2>
      <div className="mt-3 grid gap-3 text-sm leading-6 text-black/65">
        <p>
          BMS: Fachtyp setzen, Zeugnisnoten pro Semester erfassen und Abschlussnoten als Typ Schriftlich oder Muendlich
          speichern.
        </p>
        <p>IDPA / IDAF: Fachtyp IDPA / IDAF verwenden, IDPA als Projekt und IDAF-Noten als Modul erfassen.</p>
        <p>
          EFZ: Modulfaecher als EFZ Schule oder EFZ UeK markieren. Fuer IPA ein Fach mit Name oder Kurzname IPA
          erfassen.
        </p>
      </div>
    </section>
  );
}

function BmsStatusCard({ status }: { status: SavedBmsStatus }) {
  const result = status.result;
  const messages = status.missing.length > 0 ? status.missing : (result?.failedConditions.map(labelBmsFailure) ?? []);

  return (
    <article className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <StatusHeader
        title="BMS Status"
        passed={result?.passed ?? null}
        href="/calculators/bms"
        actionLabel="BMS Rechner"
      />
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatusMetric label="Gesamtnote" value={formatOptionalGrade(result?.overallAverage, 1)} />
        <StatusMetric label="Fachnoten" value={`${status.subjectCount}/9`} />
        <StatusMetric label="Unter 4.0" value={result?.insufficientCount?.toString() ?? "-"} />
      </dl>
      <StatusMessages messages={messages} emptyMessage="Alle BMS-Kriterien sind erfuellt." />
    </article>
  );
}

function EfzStatusCard({ status }: { status: SavedEfzStatus }) {
  const result = status.result;
  const messages = status.missing.length > 0 ? status.missing : (result?.failedConditions.map(labelEfzFailure) ?? []);

  return (
    <article className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <StatusHeader
        title="EFZ Status"
        passed={result?.passed ?? null}
        href="/calculators/efz"
        actionLabel="EFZ Rechner"
      />
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatusMetric label="Erfahrung" value={formatOptionalGrade(result?.erfahrungsnote, 1)} />
        <StatusMetric label="Schule / UeK" value={`${status.schoolModuleCount}/${status.uekModuleCount}`} />
        <StatusMetric label="IPA" value={formatOptionalGrade(result?.ipaGrade, 1)} />
      </dl>
      {status.ipaSourceName ? <p className="mt-3 text-xs text-black/50">IPA Quelle: {status.ipaSourceName}</p> : null}
      <StatusMessages messages={messages} emptyMessage="Alle EFZ-Kriterien sind erfuellt." />
    </article>
  );
}

function StatusHeader({
  title,
  passed,
  href,
  actionLabel,
}: {
  title: string;
  passed: boolean | null;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className={`mt-1 text-sm font-semibold ${statusTone(passed)}`}>{statusLabel(passed)}</p>
      </div>
      <Link href={href} className="rounded-md border border-black/15 px-3 py-2 text-sm font-semibold text-black/70">
        {actionLabel}
      </Link>
    </div>
  );
}

function StatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-black/45">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-ink">{value}</dd>
    </div>
  );
}

function StatusMessages({ messages, emptyMessage }: { messages: string[]; emptyMessage: string }) {
  const visibleMessages = messages.length === 0 ? [emptyMessage] : messages.slice(0, 4);

  return (
    <ul className="mt-4 grid gap-2 text-sm text-black/65">
      {visibleMessages.map((message) => (
        <li key={message} className="rounded-md border border-black/10 px-3 py-2">
          {message}
        </li>
      ))}
      {messages.length > visibleMessages.length ? (
        <li className="px-3 py-1 text-xs text-black/50">
          +{messages.length - visibleMessages.length} weitere Hinweise
        </li>
      ) : null}
    </ul>
  );
}

function statusLabel(passed: boolean | null): string {
  if (passed === true) return "Bestanden";
  if (passed === false) return "Nicht bestanden";
  return "Noch offen";
}

function statusTone(passed: boolean | null): string {
  if (passed === true) return "text-alpine";
  if (passed === false) return "text-red-700";
  return "text-black/60";
}

function labelBmsFailure(condition: string): string {
  return BMS_FAILURE_LABELS[condition] ?? condition;
}

function labelEfzFailure(condition: string): string {
  return EFZ_FAILURE_LABELS[condition] ?? condition;
}

function formatOptionalGrade(value: number | null | undefined, digits: number): string {
  return value === null || value === undefined ? "-" : value.toFixed(digits);
}
