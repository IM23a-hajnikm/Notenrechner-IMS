export type DemoSubject = {
  id: string;
  name: string;
  shortName: string;
  color: string;
};

export type DemoGrade = {
  id: string;
  subjectId: string;
  title: string;
  value: number;
  weight: number;
  date: string;
};

export type DemoState = {
  subjects: DemoSubject[];
  grades: DemoGrade[];
};

export const demoSeed: DemoState = {
  subjects: [
    { id: "math", name: "Mathematik", shortName: "MA", color: "#1f7a68" },
    { id: "de", name: "Deutsch", shortName: "DE", color: "#2b6cb0" },
    { id: "wr", name: "Wirtschaft und Recht", shortName: "WR", color: "#d97706" },
  ],
  grades: [
    { id: "g1", subjectId: "math", title: "Algebra Test", value: 4.5, weight: 1, date: "2026-02-14" },
    { id: "g2", subjectId: "math", title: "Funktionen", value: 5, weight: 2, date: "2026-03-12" },
    { id: "g3", subjectId: "de", title: "Essay", value: 4, weight: 1, date: "2026-03-18" },
    { id: "g4", subjectId: "wr", title: "Fallstudie", value: 3.75, weight: 1, date: "2026-04-02" },
  ],
};
