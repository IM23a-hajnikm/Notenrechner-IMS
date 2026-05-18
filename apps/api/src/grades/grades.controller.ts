import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";

import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateGradeDto, UpdateGradeDto } from "./grades.dto";
import { GradesService } from "./grades.service";

@Controller("grades")
@UseGuards(JwtAuthGuard)
export class GradesController {
  constructor(private readonly grades: GradesService) {}

  @Get()
  findMany(@CurrentUser() user: AuthenticatedUser) {
    return this.grades.findMany(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGradeDto) {
    return this.grades.create(user.id, dto);
  }

  @Get(":id")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.grades.findOne(user.id, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateGradeDto) {
    return this.grades.update(user.id, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.grades.remove(user.id, id);
  }
}
