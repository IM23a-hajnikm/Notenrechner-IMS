import { IsIn, IsISO8601, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

const GRADE_TYPES = ["exam", "quiz", "project", "module", "oral", "written", "other"] as const;

export class CreateGradeDto {
  @IsString()
  subjectId: string;

  @IsOptional()
  @IsString()
  termId?: string | null;

  @IsString()
  @MaxLength(160)
  title: string;

  @IsNumber()
  @Min(1)
  @Max(6)
  gradeValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsISO8601()
  date?: string | null;

  @IsOptional()
  @IsIn(GRADE_TYPES)
  type?: (typeof GRADE_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpdateGradeDto {
  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  termId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  gradeValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsISO8601()
  date?: string | null;

  @IsOptional()
  @IsIn(GRADE_TYPES)
  type?: (typeof GRADE_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
