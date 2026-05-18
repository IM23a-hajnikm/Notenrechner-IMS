import { IsBoolean, IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateTermDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string | null;

  @IsOptional()
  @IsISO8601()
  endDate?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTermDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string | null;

  @IsOptional()
  @IsISO8601()
  endDate?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
