export type ParsedNumberList = {
  values: number[];
  error: string | null;
};

export function parseNumberList(raw: string, fieldLabel: string): ParsedNumberList {
  const trimmed = raw.trim();
  if (!trimmed) return { values: [], error: null };

  const values: number[] = [];
  const parts = trimmed
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const value = Number(part);

    if (!Number.isFinite(value)) {
      return { values: [], error: `${fieldLabel}: "${part}" ist keine gueltige Zahl.` };
    }

    if (value < 1 || value > 6) {
      return { values: [], error: `${fieldLabel}: ${value} liegt ausserhalb der Schweizer Notenskala 1-6.` };
    }

    values.push(value);
  }

  return { values, error: null };
}

export function parseOptionalGrade(raw: string, fieldLabel: string): { value: number | null; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: null };

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { value: null, error: `${fieldLabel}: "${trimmed}" ist keine gueltige Zahl.` };
  if (value < 1 || value > 6) {
    return { value: null, error: `${fieldLabel}: ${value} liegt ausserhalb der Schweizer Notenskala 1-6.` };
  }

  return { value, error: null };
}

export function parsePositiveNumber(raw: string, fieldLabel: string): { value: number | null; error: string | null } {
  const value = Number(raw);
  if (!Number.isFinite(value)) return { value: null, error: `${fieldLabel}: "${raw}" ist keine gueltige Zahl.` };
  if (value <= 0) return { value: null, error: `${fieldLabel} muss groesser als 0 sein.` };
  return { value, error: null };
}

export function formatGrade(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined ? "-" : value.toFixed(digits);
}

export function statusLabel(value: boolean | null): string {
  if (value === true) return "Bestanden";
  if (value === false) return "Nicht bestanden";
  return "Unvollstaendig";
}
