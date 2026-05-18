import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";

import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateSubjectDto, UpdateSubjectDto } from "./subjects.dto";
import { SubjectsService } from "./subjects.service";

@Controller("subjects")
@UseGuards(JwtAuthGuard)
export class SubjectsController {
  constructor(@Inject(SubjectsService) private readonly subjects: SubjectsService) {}

  @Get()
  findMany(@CurrentUser() user: AuthenticatedUser) {
    return this.subjects.findMany(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSubjectDto) {
    return this.subjects.create(user.id, dto);
  }

  @Get(":id")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.subjects.findOne(user.id, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjects.update(user.id, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.subjects.remove(user.id, id);
  }
}
