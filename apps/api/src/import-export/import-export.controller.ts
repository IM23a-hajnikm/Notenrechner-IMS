import { Body, Controller, Get, Inject, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";

import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ImportGradesCsvDto } from "./import-export.dto";
import { ImportExportService } from "./import-export.service";

@Controller("import-export")
@UseGuards(JwtAuthGuard)
export class ImportExportController {
  constructor(@Inject(ImportExportService) private readonly importExport: ImportExportService) {}

  @Get("csv")
  async exportCsv(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="notenrechner-export.csv"');
    return this.importExport.exportCsv(user.id);
  }

  @Post("grades/csv")
  importGrades(@CurrentUser() user: AuthenticatedUser, @Body() dto: ImportGradesCsvDto) {
    return this.importExport.importGrades(user.id, dto.csv);
  }
}
