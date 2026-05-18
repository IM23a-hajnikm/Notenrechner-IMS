import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";

import { ACCESS_TOKEN_COOKIE, getAccessTokenCookieOptions } from "./auth.config";
import { CurrentUser } from "./current-user.decorator";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import type { AuthenticatedUser } from "./auth.types";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(dto);
    response.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, getAccessTokenCookieOptions(this.config));

    return { user: result.user };
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto);
    response.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, getAccessTokenCookieOptions(this.config));

    return { user: result.user };
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(ACCESS_TOKEN_COOKIE, {
      ...getAccessTokenCookieOptions(this.config),
      maxAge: undefined,
    });

    return { ok: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.getMe(user.id);
  }
}
