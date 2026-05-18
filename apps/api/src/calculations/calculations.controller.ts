import { Body, Controller, Post } from "@nestjs/common";
import {
  calculateBmsResult,
  calculateEfzResult,
  calculateRequiredGrade,
  calculateSemesterGrade,
  calculateWeightedAverage,
} from "@notenrechner/shared";

import { BmsCalculationDto, EfzCalculationDto, RequiredGradeDto, WeightedAverageDto } from "./calculations.dto";

@Controller("calculations")
export class CalculationsController {
  @Post("weighted-average")
  calculateWeightedAverage(@Body() dto: WeightedAverageDto) {
    return {
      average: calculateWeightedAverage(dto.items),
      semesterGrade: calculateSemesterGrade(dto.items),
    };
  }

  @Post("required-grade")
  calculateRequiredGrade(@Body() dto: RequiredGradeDto) {
    return {
      requiredGrade: calculateRequiredGrade(dto.currentItems, dto.upcomingWeight, dto.targetExactAverage),
    };
  }

  @Post("bms")
  calculateBms(@Body() dto: BmsCalculationDto) {
    return calculateBmsResult(dto.subjects);
  }

  @Post("efz")
  calculateEfz(@Body() dto: EfzCalculationDto) {
    return calculateEfzResult(dto);
  }
}
