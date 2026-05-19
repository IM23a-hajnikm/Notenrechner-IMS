"use client";

import { type ChangeEvent, useMemo, useState } from "react";

import {
  CsvImportError,
  CsvImportPreview,
  CsvSubject,
  CsvTerm,
  downloadTextFile,
  previewGradeCsvImport,
} from "./grade-csv";

type CsvImportCommitResult = {
  imported: number;
  errors?: CsvImportError[];
};

type CsvImportExportPanelProps = {
  title: string;
  description: string;
  filename: string;
  subjects: CsvSubject[];
  terms: CsvTerm[];
  disabled?: boolean;
  onExport: () => Promise<string> | string;
  onImport: (csv: string, preview: CsvImportPreview) => Promise<CsvImportCommitResult> | CsvImportCommitResult;
};

type PanelStatus = {
  kind: "success" | "warning" | "error";
  message: string;
  errors?: CsvImportError[];
};

const VISIBLE_PREVIEW_ROWS = 4;
const CSV_COLUMNS = ["subjectName", "termName", "title", "gradeValue", "weight", "date", "type", "notes"];

export function CsvImportExportPanel({
  title,
  description,
  filename,
  subjects,
  terms,
  disabled = false,
  onExport,
  onImport,
}: CsvImportExportPanelProps) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const [status, setStatus] = useState<PanelStatus | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const subjectLabels = useMemo(() => {
    return new Map(
      subjects.map((subject) => [
        subject.id,
        subject.shortName ? `${subject.shortName} - ${subject.name}` : subject.name,
      ]),
    );
  }, [subjects]);

  const termLabels = useMemo(() => {
    return new Map(terms.map((term) => [term.id, term.name]));
  }, [terms]);

  const hasBlockingPreviewErrors = Boolean(preview?.errors.length);
  const isBusy = disabled || isExporting || isImporting;

  async function exportCsv() {
    setStatus(null);
    setIsExporting(true);

    try {
      const contents = await onExport();
      downloadTextFile(filename, contents);
      setStatus({ kind: "success", message: "CSV wurde exportiert." });
    } catch (caught) {
      setStatus({
        kind: "error",
        message: caught instanceof Error ? caught.message : "CSV konnte nicht exportiert werden.",
      });
    } finally {
      setIsExporting(false);
    }
  }

  function checkCsv() {
    setStatus(null);

    if (subjects.length === 0) {
      setPreview({
        drafts: [],
        errors: [{ row: 1, message: "Lege zuerst mindestens ein Fach an." }],
      });
      return;
    }

    setPreview(previewGradeCsvImport(csvText, subjects, terms));
  }

  async function loadCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setCsvText(text);
      setPreview(null);
      setStatus({ kind: "success", message: "CSV-Datei wurde geladen. Pruefe sie vor dem Import." });
    } catch {
      setStatus({ kind: "error", message: "CSV-Datei konnte nicht gelesen werden." });
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function confirmImport() {
    if (!preview || preview.errors.length > 0 || preview.drafts.length === 0) return;

    setStatus(null);
    setIsImporting(true);

    try {
      const result = await onImport(csvText, preview);
      const resultErrors = result.errors ?? [];

      if (resultErrors.length > 0) {
        setStatus({
          kind: result.imported > 0 ? "warning" : "error",
          message:
            result.imported > 0
              ? `${result.imported} Noten importiert, ${resultErrors.length} Zeilen mit Rueckmeldungen.`
              : "Keine Noten importiert.",
          errors: resultErrors,
        });
        return;
      }

      setCsvText("");
      setPreview(null);
      setStatus({
        kind: "success",
        message: `${result.imported} ${result.imported === 1 ? "Note" : "Noten"} importiert.`,
      });
    } catch (caught) {
      setStatus({
        kind: "error",
        message: caught instanceof Error ? caught.message : "CSV konnte nicht importiert werden.",
      });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="text-sm text-black/60">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => void exportCsv()}
          disabled={isBusy}
          className="rounded-md bg-alpine px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isExporting ? "Exportiert..." : "CSV exportieren"}
        </button>
      </div>

      <div className="mt-4 rounded-md border border-black/10 bg-black/[0.02] p-3 text-xs leading-5 text-black/65">
        <p className="font-semibold text-black/70">Unterstuetzte Spalten</p>
        <p className="mt-1 break-words">
          {CSV_COLUMNS.join(", ")}. Alternativ sind subjectId und termId moeglich; type akzeptiert exam, quiz, project,
          module, oral, written oder other.
        </p>
      </div>

      <label className="mt-4 grid gap-1 text-sm font-medium text-black/70">
        CSV-Datei
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void loadCsvFile(event)}
          disabled={isBusy}
          className="rounded-md border border-black/15 px-3 py-2 text-sm text-black/70 file:mr-3 file:rounded-md file:border-0 file:bg-black/5 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink disabled:opacity-60"
        />
      </label>

      <label className="mt-4 grid gap-1 text-sm font-medium text-black/70">
        CSV einfuegen
        <textarea
          value={csvText}
          onChange={(event) => {
            setCsvText(event.target.value);
            setPreview(null);
            setStatus(null);
          }}
          disabled={isBusy}
          rows={8}
          spellCheck={false}
          placeholder="subjectName,termName,title,gradeValue,weight,date,type,notes"
          className="min-h-40 rounded-md border border-black/15 px-3 py-2 font-mono text-xs leading-5 text-ink disabled:opacity-60"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={checkCsv}
          disabled={isBusy || !csvText.trim()}
          className="rounded-md border border-black/15 px-3 py-2 text-sm font-semibold text-ink hover:border-black/30 disabled:opacity-60"
        >
          CSV pruefen
        </button>
        {preview && !hasBlockingPreviewErrors ? (
          <button
            type="button"
            onClick={() => void confirmImport()}
            disabled={isBusy || preview.drafts.length === 0}
            className="rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isImporting ? "Importiert..." : "Import bestaetigen"}
          </button>
        ) : null}
      </div>

      {status ? <StatusMessage status={status} /> : null}

      {preview?.errors.length ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">Bitte pruefe diese Zeilen vor dem Import.</p>
          <ErrorList errors={preview.errors} />
        </div>
      ) : null}

      {preview && !preview.errors.length ? (
        <div className="mt-4 rounded-md border border-alpine/25 bg-alpine/10 p-3 text-sm text-black/70">
          <p className="font-semibold text-ink">
            {preview.drafts.length} {preview.drafts.length === 1 ? "Notenzeile" : "Notenzeilen"} bereit.
          </p>
          <div className="mt-2 grid gap-2">
            {preview.drafts.slice(0, VISIBLE_PREVIEW_ROWS).map((draft, index) => (
              <div key={`${draft.subjectId}-${draft.title}-${index}`} className="rounded-md bg-white/80 px-3 py-2">
                <p className="font-semibold text-ink">{draft.title}</p>
                <p className="text-xs text-black/60">
                  {subjectLabels.get(draft.subjectId) ?? draft.subjectId} /{" "}
                  {draft.termId ? (termLabels.get(draft.termId) ?? draft.termId) : "kein Semester"} / Note {draft.value}{" "}
                  / Gewicht {draft.weight}
                </p>
              </div>
            ))}
            {preview.drafts.length > VISIBLE_PREVIEW_ROWS ? (
              <p className="text-xs text-black/55">+ {preview.drafts.length - VISIBLE_PREVIEW_ROWS} weitere Zeilen</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StatusMessage({ status }: { status: PanelStatus }) {
  const className =
    status.kind === "success"
      ? "border-alpine/25 bg-alpine/10 text-black/70"
      : status.kind === "warning"
        ? "border-signal/30 bg-signal/10 text-black/70"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`mt-4 rounded-md border p-3 text-sm ${className}`}>
      <p className="font-semibold">{status.message}</p>
      {status.errors?.length ? <ErrorList errors={status.errors} /> : null}
    </div>
  );
}

function ErrorList({ errors }: { errors: CsvImportError[] }) {
  return (
    <ul className="mt-2 grid gap-1">
      {errors.map((error, index) => (
        <li key={`${error.row}-${error.message}-${index}`}>
          Zeile {error.row}: {error.message}
        </li>
      ))}
    </ul>
  );
}
