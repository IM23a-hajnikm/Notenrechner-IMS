import { calculateBmsResult, calculateEfzResult, calculateSemesterGrade } from "@notenrechner/shared";
import type {
  BmsResult,
  BmsSubjectInput,
  EfzResult,
  GradeType,
  SubjectType,
  WeightedGradeInput,
} from "@notenrechner/shared";

export type SavedDataSubject = {
  id: string;
  name: string;
  shortName?: string | null;
  subjectType: SubjectType;
  archived?: boolean;
};

export type SavedDataGrade = {
  subjectId: string;
  termId?: string | null;
  title?: string;
  gradeValue?: string | number;
  value?: string | number;
  weight?: string | number;
  type?: GradeType;
};

export type SavedCertificationStatus = {
  bms: SavedBmsStatus;
  efz: SavedEfzStatus;
};

export type SavedBmsStatus = {
  isRelevant: boolean;
  subjectCount: number;
  subjects: BmsSubjectInput[];
  result: BmsResult | null;
  missing: string[];
};

export type SavedEfzStatus = {
  isRelevant: boolean;
  schoolModuleCount: number;
  uekModuleCount: number;
  ipaSourceName: string | null;
  result: EfzResult | null;
  missing: string[];
};

const BMS_SUBJECT_TYPES: SubjectType[] = ["bms_exam_subject", "bms_non_exam_subject", "bms_idpa_idaf"];

export function deriveSavedCertificationStatus(
  subjects: SavedDataSubject[],
  grades: SavedDataGrade[],
): SavedCertificationStatus {
  const activeSubjects = subjects.filter((subject) => !subject.archived);
  const gradesBySubject = groupGradesBySubject(grades);

  return {
    bms: deriveBmsStatus(activeSubjects, gradesBySubject),
    efz: deriveEfzStatus(activeSubjects, grades, gradesBySubject),
  };
}

function deriveBmsStatus(subjects: SavedDataSubject[], gradesBySubject: Map<string, SavedDataGrade[]>): SavedBmsStatus {
  const bmsSubjects = subjects.filter((subject) => BMS_SUBJECT_TYPES.includes(subject.subjectType));
  const missing: string[] = [];

  const inputs = bmsSubjects.map((subject) => {
    const subjectGrades = gradesBySubject.get(subject.id) ?? [];

    if (subject.subjectType === "bms_idpa_idaf") {
      const idpaGrade = calculateGradeGroup(subjectGrades.filter(isIdpaGrade));
      const idafGrades = subjectGrades.filter(isIdafGrade).flatMap((grade) => {
        const value = readGradeValue(grade);
        return value === null ? [] : [value];
      });

      if (idpaGrade === null) missing.push(`${subject.name}: IDPA-Note als Typ Projekt fehlt.`);
      if (idafGrades.length === 0) missing.push(`${subject.name}: IDAF-Noten als Typ Modul fehlen.`);

      return {
        id: subject.id,
        name: subject.name,
        kind: "idpa_idaf",
        ...(idpaGrade !== null ? { idpaGrade } : {}),
        idafGrades,
      } satisfies BmsSubjectInput;
    }

    const semesterGrades = calculateTermSemesterGrades(subjectGrades.filter((grade) => !isFinalBmsExamGrade(grade)));
    if (semesterGrades.length === 0) missing.push(`${subject.name}: Semester-/Zeugnisnoten fehlen.`);

    if (subject.subjectType === "bms_non_exam_subject") {
      return {
        id: subject.id,
        name: subject.name,
        kind: "non_exam",
        semesterGrades,
      } satisfies BmsSubjectInput;
    }

    const writtenExamGrade = calculateGradeGroup(subjectGrades.filter((grade) => grade.type === "written"));
    const oralExamGrade = calculateGradeGroup(subjectGrades.filter((grade) => grade.type === "oral"));

    if (writtenExamGrade === null) missing.push(`${subject.name}: schriftliche Abschlussnote fehlt.`);
    if (oralExamGrade === null) missing.push(`${subject.name}: muendliche Abschlussnote fehlt.`);

    return {
      id: subject.id,
      name: subject.name,
      kind: "exam",
      semesterGrades,
      ...(writtenExamGrade !== null ? { writtenExamGrade } : {}),
      ...(oralExamGrade !== null ? { oralExamGrade } : {}),
    } satisfies BmsSubjectInput;
  });

  if (bmsSubjects.length > 0 && bmsSubjects.length !== 9) {
    missing.unshift(`BMS braucht genau 9 markierte Faecher; aktuell ${bmsSubjects.length}.`);
  }

  return {
    isRelevant: bmsSubjects.length > 0,
    subjectCount: bmsSubjects.length,
    subjects: inputs,
    result: bmsSubjects.length === 0 ? null : calculateBmsResult(inputs),
    missing,
  };
}

function deriveEfzStatus(
  subjects: SavedDataSubject[],
  grades: SavedDataGrade[],
  gradesBySubject: Map<string, SavedDataGrade[]>,
): SavedEfzStatus {
  const schoolSubjects = subjects.filter((subject) => subject.subjectType === "efz_school_module");
  const uekSubjects = subjects.filter((subject) => subject.subjectType === "efz_uek_module");
  const missing: string[] = [];

  const schoolModules = calculateModuleGrades(schoolSubjects, gradesBySubject, missing, "Schulmodul");
  const uekModules = calculateModuleGrades(uekSubjects, gradesBySubject, missing, "UeK-Modul");
  const ipa = calculateIpaGrade(subjects, grades, gradesBySubject);

  if (schoolSubjects.length === 0) missing.push("EFZ braucht mindestens ein Fach vom Typ EFZ Schule.");
  if (uekSubjects.length === 0) missing.push("EFZ braucht mindestens ein Fach vom Typ EFZ UeK.");
  if (ipa.grade === null) missing.push("IPA fehlt: Fach oder Note mit Name/Kurzname/Titel IPA erfassen.");

  const isRelevant = schoolSubjects.length > 0 || uekSubjects.length > 0 || ipa.grade !== null;

  return {
    isRelevant,
    schoolModuleCount: schoolModules.length,
    uekModuleCount: uekModules.length,
    ipaSourceName: ipa.sourceName,
    result: isRelevant
      ? calculateEfzResult({
          schoolModules,
          uekModules,
          ipaGrade: ipa.grade,
        })
      : null,
    missing,
  };
}

function calculateModuleGrades(
  subjects: SavedDataSubject[],
  gradesBySubject: Map<string, SavedDataGrade[]>,
  missing: string[],
  label: string,
): number[] {
  return subjects.flatMap((subject) => {
    const moduleGrade = calculateGradeGroup(gradesBySubject.get(subject.id) ?? []);
    if (moduleGrade === null) {
      missing.push(`${subject.name}: ${label}-Note fehlt.`);
      return [];
    }
    return [moduleGrade];
  });
}

function calculateIpaGrade(
  subjects: SavedDataSubject[],
  grades: SavedDataGrade[],
  gradesBySubject: Map<string, SavedDataGrade[]>,
): { grade: number | null; sourceName: string | null } {
  const ipaSubject = subjects.find(isIpaSubject);

  if (ipaSubject) {
    return {
      grade: calculateGradeGroup(gradesBySubject.get(ipaSubject.id) ?? []),
      sourceName: ipaSubject.name,
    };
  }

  const ipaGrades = grades.filter(isIpaGrade);

  return {
    grade: calculateGradeGroup(ipaGrades),
    sourceName: ipaGrades.length > 0 ? "IPA-Noten" : null,
  };
}

function calculateTermSemesterGrades(grades: SavedDataGrade[]): number[] {
  const groups = new Map<string, WeightedGradeInput[]>();

  for (const grade of grades) {
    const weighted = toWeightedGrade(grade);
    if (!weighted) continue;

    const key = grade.termId ?? "ohne-semester";
    groups.set(key, [...(groups.get(key) ?? []), weighted]);
  }

  return [...groups.values()].flatMap((items) => {
    const semesterGrade = calculateSemesterGrade(items);
    return semesterGrade === null ? [] : [semesterGrade];
  });
}

function calculateGradeGroup(grades: SavedDataGrade[]): number | null {
  const items = grades.flatMap((grade) => {
    const weighted = toWeightedGrade(grade);
    return weighted ? [weighted] : [];
  });

  if (items.length === 0) return null;

  return calculateSemesterGrade(items);
}

function groupGradesBySubject(grades: SavedDataGrade[]): Map<string, SavedDataGrade[]> {
  const groups = new Map<string, SavedDataGrade[]>();

  for (const grade of grades) {
    groups.set(grade.subjectId, [...(groups.get(grade.subjectId) ?? []), grade]);
  }

  return groups;
}

function toWeightedGrade(grade: SavedDataGrade): WeightedGradeInput | null {
  const value = readGradeValue(grade);
  const weight = readGradeWeight(grade);

  if (value === null || weight === null || weight < 0) return null;

  return { value, weight };
}

function readGradeValue(grade: SavedDataGrade): number | null {
  const value = Number(grade.gradeValue ?? grade.value);
  if (!Number.isFinite(value) || value < 1 || value > 6) return null;
  return value;
}

function readGradeWeight(grade: SavedDataGrade): number | null {
  const weight = Number(grade.weight ?? 1);
  return Number.isFinite(weight) ? weight : null;
}

function isFinalBmsExamGrade(grade: SavedDataGrade): boolean {
  return grade.type === "written" || grade.type === "oral";
}

function isIdpaGrade(grade: SavedDataGrade): boolean {
  return grade.type === "project" || includesToken(grade.title, "idpa");
}

function isIdafGrade(grade: SavedDataGrade): boolean {
  return grade.type === "module" || includesToken(grade.title, "idaf");
}

function isIpaSubject(subject: SavedDataSubject): boolean {
  return includesToken(subject.name, "ipa") || includesToken(subject.shortName, "ipa");
}

function isIpaGrade(grade: SavedDataGrade): boolean {
  return includesToken(grade.title, "ipa") || includesToken(grade.title, "facharbeit");
}

function includesToken(value: string | null | undefined, token: string): boolean {
  return value?.toLowerCase().includes(token) ?? false;
}
