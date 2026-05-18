import type {
  BmsFailedCondition,
  BmsResult,
  BmsSubjectInput,
  BmsSubjectResult,
  EfzFailedCondition,
  EfzInput,
  EfzResult,
  WeightedGradeInput,
} from "./types";

const MIN_SWISS_GRADE = 1;
const MAX_SWISS_GRADE = 6;
const REQUIRED_BMS_FACHNOTEN = 9;

export function roundToHalf(value: number): number {
  assertFiniteNumber(value, "value");
  return Math.round(value * 2) / 2;
}

export function roundToOneDecimal(value: number): number {
  assertFiniteNumber(value, "value");
  return Math.round(value * 10) / 10;
}

export function roundToQuarter(value: number): number {
  assertFiniteNumber(value, "value");
  return Math.round(value * 4) / 4;
}

export function calculateWeightedAverage(items: WeightedGradeInput[]): number | null {
  validateWeightedGradeItems(items);

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return null;

  const totalScore = items.reduce((sum, item) => sum + item.value * item.weight, 0);
  return totalScore / totalWeight;
}

export function calculateSemesterGrade(items: WeightedGradeInput[]): number | null {
  const exactAverage = calculateWeightedAverage(items);
  return exactAverage === null ? null : roundToHalf(exactAverage);
}

export function minimumExactAverageForRoundedHalf(targetRoundedGrade: number): number {
  assertSwissGrade(targetRoundedGrade, "targetRoundedGrade");

  const roundedTarget = roundToHalf(targetRoundedGrade);
  if (roundedTarget !== targetRoundedGrade) {
    throw new RangeError("targetRoundedGrade must already be rounded to a 0.5 step.");
  }

  return Math.max(MIN_SWISS_GRADE, targetRoundedGrade - 0.25);
}

export function calculateRequiredGrade(
  currentItems: WeightedGradeInput[],
  upcomingWeight: number,
  targetExactAverage: number,
): number | null {
  validateWeightedGradeItems(currentItems);
  assertFiniteNumber(upcomingWeight, "upcomingWeight");
  assertFiniteNumber(targetExactAverage, "targetExactAverage");

  if (upcomingWeight <= 0) return null;

  const currentTotalWeight = currentItems.reduce((sum, item) => sum + item.weight, 0);
  const currentTotalScore = currentItems.reduce((sum, item) => sum + item.value * item.weight, 0);
  const requiredTotalScore = targetExactAverage * (currentTotalWeight + upcomingWeight);

  return (requiredTotalScore - currentTotalScore) / upcomingWeight;
}

export function calculateBmsPosition2(semesterGrades: number[]): number | null {
  validateSwissGrades(semesterGrades, "semesterGrades");
  if (semesterGrades.length === 0) return null;
  return roundToHalf(average(semesterGrades));
}

export function calculateBmsPosition1(
  input: Pick<BmsSubjectInput, "examGrade" | "writtenExamGrade" | "oralExamGrade">,
): number | null {
  if (input.examGrade !== undefined) {
    assertSwissGrade(input.examGrade, "examGrade");
    return input.examGrade;
  }

  const { writtenExamGrade, oralExamGrade } = input;
  const hasWritten = writtenExamGrade !== undefined;
  const hasOral = oralExamGrade !== undefined;

  if (!hasWritten && !hasOral) return null;
  if (!hasWritten || !hasOral) return null;

  assertSwissGrade(writtenExamGrade, "writtenExamGrade");
  assertSwissGrade(oralExamGrade, "oralExamGrade");

  return roundToHalf((writtenExamGrade + oralExamGrade) / 2);
}

export function calculateBmsSubject(input: BmsSubjectInput): BmsSubjectResult {
  const position2 = input.kind === "idpa_idaf" ? null : calculateBmsPosition2(input.semesterGrades ?? []);
  const position1 = input.kind === "exam" ? calculateBmsPosition1(input) : null;

  if (input.kind === "exam") {
    return {
      id: input.id,
      name: input.name,
      kind: input.kind,
      position1,
      position2,
      fachnote: position1 === null || position2 === null ? null : roundToHalf((position1 + position2) / 2),
    };
  }

  if (input.kind === "non_exam") {
    return {
      id: input.id,
      name: input.name,
      kind: input.kind,
      position1: null,
      position2,
      fachnote: position2,
    };
  }

  const idpaGrade = input.idpaGrade;
  const idafGrades = input.idafGrades ?? [];

  if (idpaGrade !== undefined) {
    assertSwissGrade(idpaGrade, "idpaGrade");
  }
  validateSwissGrades(idafGrades, "idafGrades");

  const idafAverage = idafGrades.length === 0 ? null : average(idafGrades);
  const fachnote = idpaGrade === undefined || idafAverage === null ? null : roundToHalf((idpaGrade + idafAverage) / 2);

  return {
    id: input.id,
    name: input.name,
    kind: input.kind,
    position1: null,
    position2: null,
    fachnote,
  };
}

export function calculateBmsResult(subjects: BmsSubjectInput[]): BmsResult {
  const subjectResults = subjects.map(calculateBmsSubject);
  const fachnoten = subjectResults.flatMap((subject) => (subject.fachnote === null ? [] : [subject.fachnote]));
  const hasNineSubjects = subjectResults.length === REQUIRED_BMS_FACHNOTEN;
  const isComplete = hasNineSubjects && fachnoten.length === REQUIRED_BMS_FACHNOTEN;

  if (!isComplete) {
    const failedConditions: BmsFailedCondition[] = ["incomplete"];
    if (!hasNineSubjects) failedConditions.push("not_exactly_nine_fachnoten");

    return {
      subjects: subjectResults,
      isComplete: false,
      overallAverage: null,
      insufficientCount: null,
      totalDeviation: null,
      passed: null,
      failedConditions,
    };
  }

  const overallAverage = roundToOneDecimal(average(fachnoten));
  const insufficient = fachnoten.filter((grade) => grade < 4);
  const insufficientCount = insufficient.length;
  const totalDeviation = roundToOneDecimal(insufficient.reduce((sum, grade) => sum + (4 - grade), 0));
  const failedConditions: BmsFailedCondition[] = [];

  if (overallAverage < 4) failedConditions.push("overall_average_below_4");
  if (insufficientCount > 2) failedConditions.push("too_many_insufficient_fachnoten");
  if (totalDeviation > 2) failedConditions.push("total_deviation_above_2");

  return {
    subjects: subjectResults,
    isComplete: true,
    overallAverage,
    insufficientCount,
    totalDeviation,
    passed: failedConditions.length === 0,
    failedConditions,
  };
}

export function calculateEfzResult(input: EfzInput): EfzResult {
  validateSwissGrades(input.schoolModules, "schoolModules");
  validateSwissGrades(input.uekModules, "uekModules");

  if (input.ipaGrade !== null) {
    assertSwissGrade(input.ipaGrade, "ipaGrade");
  }

  const schoolAverage = input.schoolModules.length === 0 ? null : roundToHalf(average(input.schoolModules));
  const uekAverage = input.uekModules.length === 0 ? null : roundToHalf(average(input.uekModules));

  if (schoolAverage === null || uekAverage === null || input.ipaGrade === null) {
    return {
      schoolAverage,
      uekAverage,
      erfahrungsnote: null,
      ipaGrade: input.ipaGrade,
      passed: null,
      failedConditions: ["incomplete"],
    };
  }

  const erfahrungsnote = roundToOneDecimal(schoolAverage * 0.8 + uekAverage * 0.2);
  const failedConditions: EfzFailedCondition[] = [];

  if (erfahrungsnote < 4) failedConditions.push("erfahrungsnote_below_4");
  if (input.ipaGrade < 4) failedConditions.push("ipa_below_4");

  return {
    schoolAverage,
    uekAverage,
    erfahrungsnote,
    ipaGrade: input.ipaGrade,
    passed: failedConditions.length === 0,
    failedConditions,
  };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function validateWeightedGradeItems(items: WeightedGradeInput[]): void {
  items.forEach((item, index) => {
    assertSwissGrade(item.value, `items[${index}].value`);
    assertFiniteNumber(item.weight, `items[${index}].weight`);

    if (item.weight < 0) {
      throw new RangeError(`items[${index}].weight must not be negative.`);
    }
  });
}

function validateSwissGrades(grades: number[], fieldName: string): void {
  grades.forEach((grade, index) => assertSwissGrade(grade, `${fieldName}[${index}]`));
}

function assertSwissGrade(value: number, fieldName: string): asserts value is number {
  assertFiniteNumber(value, fieldName);

  if (value < MIN_SWISS_GRADE || value > MAX_SWISS_GRADE) {
    throw new RangeError(`${fieldName} must be between ${MIN_SWISS_GRADE} and ${MAX_SWISS_GRADE}.`);
  }
}

function assertFiniteNumber(value: number, fieldName: string): asserts value is number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${fieldName} must be a finite number.`);
  }
}
