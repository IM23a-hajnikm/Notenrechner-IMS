import type { GradeType, SubjectType } from "@notenrechner/shared";

export type DemoSubject = {
  id: string;
  name: string;
  shortName: string | null;
  color: string | null;
  subjectType: SubjectType;
  archived: boolean;
};

export type DemoTerm = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
};

export type DemoGrade = {
  id: string;
  subjectId: string;
  termId: string | null;
  title: string;
  value: number;
  weight: number;
  date: string | null;
  type: GradeType;
  notes: string | null;
};

export type DemoState = {
  subjects: DemoSubject[];
  terms: DemoTerm[];
  grades: DemoGrade[];
};

export const demoSeed: DemoState = {
  subjects: [
    {
      id: "math",
      name: "Mathematik",
      shortName: "MA",
      color: "#1f7a68",
      subjectType: "regular",
      archived: false,
    },
    {
      id: "de",
      name: "Deutsch",
      shortName: "DE",
      color: "#2b6cb0",
      subjectType: "regular",
      archived: false,
    },
    {
      id: "wr",
      name: "Wirtschaft und Recht",
      shortName: "WR",
      color: "#d97706",
      subjectType: "bms_exam_subject",
      archived: false,
    },
  ],
  terms: [
    {
      id: "sem-3",
      name: "3. Semester",
      startDate: "2026-02-01",
      endDate: "2026-07-10",
      isActive: true,
    },
    {
      id: "sem-2",
      name: "2. Semester",
      startDate: "2025-08-18",
      endDate: "2026-01-23",
      isActive: false,
    },
  ],
  grades: [
    {
      id: "g1",
      subjectId: "math",
      termId: "sem-3",
      title: "Algebra Test",
      value: 4.5,
      weight: 1,
      date: "2026-02-14",
      type: "exam",
      notes: "Lineare Gleichungen und Bruchterme.",
    },
    {
      id: "g2",
      subjectId: "math",
      termId: "sem-3",
      title: "Funktionen",
      value: 5,
      weight: 2,
      date: "2026-03-12",
      type: "written",
      notes: null,
    },
    {
      id: "g3",
      subjectId: "de",
      termId: "sem-3",
      title: "Essay",
      value: 4,
      weight: 1,
      date: "2026-03-18",
      type: "project",
      notes: "Argumentation war solide, Sprache noch schaerfen.",
    },
    {
      id: "g4",
      subjectId: "wr",
      termId: "sem-2",
      title: "Fallstudie",
      value: 3.75,
      weight: 1,
      date: "2026-04-02",
      type: "project",
      notes: null,
    },
  ],
};
