import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";

import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateTermDto, UpdateTermDto } from "./terms.dto";
import { TermsService } from "./terms.service";

@Controller("terms")
@UseGuards(JwtAuthGuard)
export class TermsController {
  constructor(private readonly terms: TermsService) {}

  @Get()
  findMany(@CurrentUser() user: AuthenticatedUser) {
    return this.terms.findMany(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTermDto) {
    return this.terms.create(user.id, dto);
  }

  @Get(":id")
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.terms.findOne(user.id, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateTermDto) {
    return this.terms.update(user.id, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.terms.remove(user.id, id);
  }
}
