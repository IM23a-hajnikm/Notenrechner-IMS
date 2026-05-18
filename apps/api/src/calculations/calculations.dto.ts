import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";

export class WeightedGradeDto {
  @IsNumber()
  @Min(1)
  @Max(6)
  value: number;

  @IsNumber()
  @Min(0)
  weight: number;
}

export class WeightedAverageDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightedGradeDto)
  items: WeightedGradeDto[];
}

export class RequiredGradeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightedGradeDto)
  currentItems: WeightedGradeDto[];

  @IsNumber()
  @Min(0)
  upcomingWeight: number;

  @IsNumber()
  targetExactAverage: number;
}

export class BmsSubjectDto {
  @IsString()
  name: string;

  @IsIn(["exam", "non_exam", "idpa_idaf"])
  kind: "exam" | "non_exam" | "idpa_idaf";

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  semesterGrades?: number[];

  @IsOptional()
  @IsNumber()
  examGrade?: number;

  @IsOptional()
  @IsNumber()
  writtenExamGrade?: number;

  @IsOptional()
  @IsNumber()
  oralExamGrade?: number;

  @IsOptional()
  @IsNumber()
  idpaGrade?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  idafGrades?: number[];
}

export class BmsCalculationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BmsSubjectDto)
  subjects: BmsSubjectDto[];
}

export class EfzCalculationDto {
  @IsArray()
  @IsNumber({}, { each: true })
  schoolModules: number[];

  @IsArray()
  @IsNumber({}, { each: true })
  uekModules: number[];

  @IsOptional()
  @IsNumber()
  ipaGrade: number | null;
}
