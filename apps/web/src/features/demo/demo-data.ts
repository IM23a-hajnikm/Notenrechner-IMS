import type { GradeType, SubjectType } from "@notenrechner/shared";

export type DemoSubject = {
  id: string;
  name: string;
  shortName: string;
  color: string;
  subjectType: SubjectType;
};

export type DemoGrade = {
  id: string;
  subjectId: string;
  termId?: string | null;
  title: string;
  value: number;
  weight: number;
  date: string;
  type: GradeType;
};

export type DemoState = {
  subjects: DemoSubject[];
  grades: DemoGrade[];
};

export const demoSeed: DemoState = {
  subjects: [
    { id: "de", name: "Deutsch", shortName: "DE", color: "#2b6cb0", subjectType: "bms_exam_subject" },
    { id: "fr", name: "Franzoesisch", shortName: "FR", color: "#365c9c", subjectType: "bms_exam_subject" },
    { id: "en", name: "Englisch", shortName: "EN", color: "#2563eb", subjectType: "bms_exam_subject" },
    { id: "math", name: "Mathematik", shortName: "MA", color: "#1f7a68", subjectType: "bms_exam_subject" },
    {
      id: "fin",
      name: "Finanz- und Rechnungswesen",
      shortName: "FRW",
      color: "#0f766e",
      subjectType: "bms_exam_subject",
    },
    { id: "wr", name: "Wirtschaft und Recht", shortName: "WR", color: "#d97706", subjectType: "bms_non_exam_subject" },
    {
      id: "gup",
      name: "Geschichte und Politik",
      shortName: "GUP",
      color: "#7c3aed",
      subjectType: "bms_non_exam_subject",
    },
    {
      id: "tup",
      name: "Technik und Umwelt",
      shortName: "TUP",
      color: "#64748b",
      subjectType: "bms_non_exam_subject",
    },
    { id: "idpa", name: "IDPA / IDAF", shortName: "IDPA", color: "#be123c", subjectType: "bms_idpa_idaf" },
    { id: "m322", name: "Modul 322", shortName: "M322", color: "#0f766e", subjectType: "efz_school_module" },
    { id: "m294", name: "Modul 294", shortName: "M294", color: "#0369a1", subjectType: "efz_school_module" },
    { id: "m295", name: "Modul 295", shortName: "M295", color: "#4338ca", subjectType: "efz_school_module" },
    { id: "uek1", name: "UeK Netzwerke", shortName: "UeK1", color: "#b45309", subjectType: "efz_uek_module" },
    { id: "uek2", name: "UeK Cloud", shortName: "UeK2", color: "#a16207", subjectType: "efz_uek_module" },
    { id: "ipa", name: "IPA Facharbeit", shortName: "IPA", color: "#dc2626", subjectType: "custom" },
  ],
  grades: [
    demoGrade("g1", "de", "Essay", 4.5, "quiz"),
    demoGrade("g2", "de", "Abschluss schriftlich", 4.5, "written"),
    demoGrade("g3", "de", "Abschluss muendlich", 4.0, "oral"),
    demoGrade("g4", "fr", "Dossier", 4.0, "quiz"),
    demoGrade("g5", "fr", "Abschluss schriftlich", 4.5, "written"),
    demoGrade("g6", "fr", "Abschluss muendlich", 4.0, "oral"),
    demoGrade("g7", "en", "Presentation", 5.0, "quiz"),
    demoGrade("g8", "en", "Abschluss schriftlich", 5.0, "written"),
    demoGrade("g9", "en", "Abschluss muendlich", 4.5, "oral"),
    demoGrade("g10", "math", "Algebra Test", 4.5, "exam"),
    demoGrade("g11", "math", "Funktionen", 5.0, "exam", 2),
    demoGrade("g12", "math", "Abschluss schriftlich", 4.0, "written"),
    demoGrade("g13", "math", "Abschluss muendlich", 4.5, "oral"),
    demoGrade("g14", "fin", "Bilanz", 4.5, "exam"),
    demoGrade("g15", "fin", "Abschluss schriftlich", 4.5, "written"),
    demoGrade("g16", "fin", "Abschluss muendlich", 4.5, "oral"),
    demoGrade("g17", "wr", "Fallstudie", 3.75, "exam"),
    demoGrade("g18", "gup", "Quellenanalyse", 4.5, "exam"),
    demoGrade("g19", "tup", "Nachhaltigkeit", 5.0, "project"),
    demoGrade("g20", "idpa", "IDPA Projekt", 4.5, "project"),
    demoGrade("g21", "idpa", "IDAF 1", 4.0, "module"),
    demoGrade("g22", "idpa", "IDAF 2", 4.5, "module"),
    demoGrade("g23", "m322", "Modulabschluss", 4.5, "module"),
    demoGrade("g24", "m294", "Modulabschluss", 5.0, "module"),
    demoGrade("g25", "m295", "Modulabschluss", 4.5, "module"),
    demoGrade("g26", "uek1", "UeK Kompetenznachweis", 5.0, "module"),
    demoGrade("g27", "uek2", "UeK Kompetenznachweis", 4.5, "module"),
    demoGrade("g28", "ipa", "IPA", 4.5, "project"),
  ],
};

function demoGrade(
  id: string,
  subjectId: string,
  title: string,
  value: number,
  type: GradeType,
  weight = 1,
): DemoGrade {
  return {
    id,
    subjectId,
    termId: "demo-semester",
    title,
    value,
    weight,
    type,
    date: "2026-04-02",
  };
}
