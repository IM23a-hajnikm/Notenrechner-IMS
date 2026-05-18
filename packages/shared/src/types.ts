export type SubjectType =
  | "regular"
  | "bms_exam_subject"
  | "bms_non_exam_subject"
  | "bms_idpa_idaf"
  | "efz_school_module"
  | "efz_uek_module"
  | "custom";

export type GradeType = "exam" | "quiz" | "project" | "module" | "oral" | "written" | "other";

export type WeightedGradeInput = {
  value: number;
  weight: number;
};

export type BmsSubjectKind = "exam" | "non_exam" | "idpa_idaf";

export type BmsSubjectInput = {
  id?: string | undefined;
  name: string;
  kind: BmsSubjectKind;
  semesterGrades?: number[];
  examGrade?: number;
  writtenExamGrade?: number;
  oralExamGrade?: number;
  idpaGrade?: number;
  idafGrades?: number[];
};

export type BmsSubjectResult = {
  id?: string | undefined;
  name: string;
  kind: BmsSubjectKind;
  position1: number | null;
  position2: number | null;
  fachnote: number | null;
};

export type BmsResult = {
  subjects: BmsSubjectResult[];
  isComplete: boolean;
  overallAverage: number | null;
  insufficientCount: number | null;
  totalDeviation: number | null;
  passed: boolean | null;
  failedConditions: BmsFailedCondition[];
};

export type BmsFailedCondition =
  | "incomplete"
  | "not_exactly_nine_fachnoten"
  | "overall_average_below_4"
  | "too_many_insufficient_fachnoten"
  | "total_deviation_above_2";

export type EfzInput = {
  schoolModules: number[];
  uekModules: number[];
  ipaGrade: number | null;
};

export type EfzResult = {
  schoolAverage: number | null;
  uekAverage: number | null;
  erfahrungsnote: number | null;
  ipaGrade: number | null;
  passed: boolean | null;
  failedConditions: EfzFailedCondition[];
};

export type EfzFailedCondition = "incomplete" | "erfahrungsnote_below_4" | "ipa_below_4";
