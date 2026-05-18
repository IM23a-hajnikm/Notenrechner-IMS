import { describe, expect, it } from "vitest";

import {
  calculateBmsPosition1,
  calculateBmsPosition2,
  calculateBmsResult,
  calculateBmsSubject,
  calculateEfzResult,
  calculateRequiredGrade,
  calculateSemesterGrade,
  calculateWeightedAverage,
  minimumExactAverageForRoundedHalf,
  roundToHalf,
  roundToOneDecimal,
  roundToQuarter,
} from "./calculations";
import type { BmsSubjectInput } from "./types";

describe("rounding utilities", () => {
  it("rounds to the nearest 0.5 using Swiss official boundaries", () => {
    expect(roundToHalf(4.24)).toBe(4);
    expect(roundToHalf(4.25)).toBe(4.5);
    expect(roundToHalf(3.75)).toBe(4);
  });

  it("rounds to one decimal", () => {
    expect(roundToOneDecimal(4.24)).toBe(4.2);
    expect(roundToOneDecimal(4.25)).toBe(4.3);
  });

  it("rounds to quarters for optional display use", () => {
    expect(roundToQuarter(4.12)).toBe(4);
    expect(roundToQuarter(4.13)).toBe(4.25);
  });
});

describe("weighted subject calculations", () => {
  it("calculates exact weighted averages", () => {
    expect(
      calculateWeightedAverage([
        { value: 5, weight: 1 },
        { value: 4, weight: 2 },
      ]),
    ).toBeCloseTo(4.3333333333);
  });

  it("returns null when total weight is zero", () => {
    expect(calculateWeightedAverage([{ value: 5, weight: 0 }])).toBeNull();
  });

  it("calculates official rounded semester grades", () => {
    expect(calculateSemesterGrade([{ value: 4.25, weight: 1 }])).toBe(4.5);
    expect(calculateSemesterGrade([{ value: 4.24, weight: 1 }])).toBe(4);
  });

  it("calculates required grade for a target exact average", () => {
    expect(
      calculateRequiredGrade(
        [
          { value: 4, weight: 1 },
          { value: 5, weight: 1 },
        ],
        1,
        4.5,
      ),
    ).toBe(4.5);
  });

  it("supports rounded target thresholds for required grades", () => {
    expect(minimumExactAverageForRoundedHalf(4.5)).toBe(4.25);
    expect(calculateRequiredGrade([{ value: 4, weight: 1 }], 1, minimumExactAverageForRoundedHalf(4.5))).toBe(4.5);
  });
});

describe("BMS calculations", () => {
  it("calculates Position 1 from written and oral exams", () => {
    expect(calculateBmsPosition1({ writtenExamGrade: 4.2, oralExamGrade: 4.8 })).toBe(4.5);
  });

  it("uses a single exam grade directly for Position 1", () => {
    expect(calculateBmsPosition1({ examGrade: 4.75 })).toBe(4.75);
  });

  it("calculates Position 2 from rounded semester grades", () => {
    expect(calculateBmsPosition2([4, 4.5, 5, 4.5])).toBe(4.5);
  });

  it("calculates Fachnote for standard exam subjects", () => {
    expect(
      calculateBmsSubject({
        name: "Mathematik",
        kind: "exam",
        writtenExamGrade: 4.2,
        oralExamGrade: 4.8,
        semesterGrades: [4, 4.5, 5, 4.5],
      }).fachnote,
    ).toBe(4.5);
  });

  it("uses Position 2 as Fachnote for non-exam subjects", () => {
    expect(
      calculateBmsSubject({
        name: "Geschichte",
        kind: "non_exam",
        semesterGrades: [4.5, 5, 5],
      }).fachnote,
    ).toBe(5);
  });

  it("calculates the IDPA/IDAF exception Fachnote", () => {
    expect(
      calculateBmsSubject({
        name: "IDPA/IDAF",
        kind: "idpa_idaf",
        idpaGrade: 5,
        idafGrades: [4, 4.5],
      }).fachnote,
    ).toBe(4.5);
  });

  it("passes when all BMS criteria are satisfied", () => {
    const result = calculateBmsResult(makeBmsSubjects([4.5, 4, 4.5, 5, 4, 4.5, 4.5, 5, 4]));

    expect(result.isComplete).toBe(true);
    expect(result.overallAverage).toBe(4.4);
    expect(result.insufficientCount).toBe(0);
    expect(result.totalDeviation).toBe(0);
    expect(result.passed).toBe(true);
    expect(result.failedConditions).toEqual([]);
  });

  it("fails when there are too many insufficient Fachnoten", () => {
    const result = calculateBmsResult(makeBmsSubjects([5, 5, 4.5, 4.5, 3.5, 3.5, 3.5, 5, 5]));

    expect(result.overallAverage).toBe(4.4);
    expect(result.insufficientCount).toBe(3);
    expect(result.totalDeviation).toBe(1.5);
    expect(result.passed).toBe(false);
    expect(result.failedConditions).toContain("too_many_insufficient_fachnoten");
  });

  it("fails when total deviation below 4.0 is above 2.0", () => {
    const result = calculateBmsResult(makeBmsSubjects([5, 5, 5, 5, 2.5, 3, 5, 5, 5]));

    expect(result.overallAverage).toBe(4.5);
    expect(result.insufficientCount).toBe(2);
    expect(result.totalDeviation).toBe(2.5);
    expect(result.passed).toBe(false);
    expect(result.failedConditions).toContain("total_deviation_above_2");
  });

  it("reports incomplete BMS input until exactly 9 Fachnoten are available", () => {
    const result = calculateBmsResult(makeBmsSubjects([4.5, 4, 5]));

    expect(result.isComplete).toBe(false);
    expect(result.passed).toBeNull();
    expect(result.failedConditions).toEqual(["incomplete", "not_exactly_nine_fachnoten"]);
  });
});

describe("EFZ calculations", () => {
  it("calculates EFZ school, UeK, and Erfahrungsnote averages", () => {
    const result = calculateEfzResult({
      schoolModules: [4, 4.5, 5, 4],
      uekModules: [5, 5.5],
      ipaGrade: 4,
    });

    expect(result.schoolAverage).toBe(4.5);
    expect(result.uekAverage).toBe(5.5);
    expect(result.erfahrungsnote).toBe(4.7);
    expect(result.passed).toBe(true);
  });

  it("fails EFZ when Erfahrungsnote is below 4.0", () => {
    const result = calculateEfzResult({
      schoolModules: [3.5, 3.5],
      uekModules: [4],
      ipaGrade: 4.5,
    });

    expect(result.erfahrungsnote).toBe(3.6);
    expect(result.passed).toBe(false);
    expect(result.failedConditions).toEqual(["erfahrungsnote_below_4"]);
  });

  it("fails EFZ when IPA is below 4.0", () => {
    const result = calculateEfzResult({
      schoolModules: [4.5, 4.5],
      uekModules: [5],
      ipaGrade: 3.5,
    });

    expect(result.erfahrungsnote).toBe(4.6);
    expect(result.passed).toBe(false);
    expect(result.failedConditions).toEqual(["ipa_below_4"]);
  });

  it("reports incomplete EFZ input", () => {
    const result = calculateEfzResult({
      schoolModules: [],
      uekModules: [5],
      ipaGrade: null,
    });

    expect(result.schoolAverage).toBeNull();
    expect(result.uekAverage).toBe(5);
    expect(result.erfahrungsnote).toBeNull();
    expect(result.passed).toBeNull();
    expect(result.failedConditions).toEqual(["incomplete"]);
  });
});

function makeBmsSubjects(fachnoten: number[]): BmsSubjectInput[] {
  return fachnoten.map((fachnote, index) => ({
    name: `Subject ${index + 1}`,
    kind: "non_exam",
    semesterGrades: [fachnote],
  }));
}
