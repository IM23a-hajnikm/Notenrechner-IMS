import { IsString, MaxLength } from "class-validator";

const MAX_CSV_LENGTH = 500_000;

export class ImportGradesCsvDto {
  @IsString()
  @MaxLength(MAX_CSV_LENGTH)
  csv: string;
}
