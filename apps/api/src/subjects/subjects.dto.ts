import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";

const SUBJECT_TYPES = [
  "regular",
  "bms_exam_subject",
  "bms_non_exam_subject",
  "bms_idpa_idaf",
  "efz_school_module",
  "efz_uek_module",
  "custom",
] as const;

export class CreateSubjectDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  shortName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;

  @IsOptional()
  @IsIn(SUBJECT_TYPES)
  subjectType?: (typeof SUBJECT_TYPES)[number];
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  shortName?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string | null;

  @IsOptional()
  @IsIn(SUBJECT_TYPES)
  subjectType?: (typeof SUBJECT_TYPES)[number];

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
