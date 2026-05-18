import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CookieOptions, Request, Response } from "express";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from "./auth.config";
import { CurrentUser } from "./current-user.decorator";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import type { AuthSession, AuthenticatedUser } from "./auth.types";
import { JwtAuthGuard } from "./jwt-auth.guard";

type RequestWithCookies = Request & {
  cookies?: Record<string, string | undefined>;
};

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(dto);
    this.setAuthCookies(response, result);

    return { user: result.user };
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto);
    this.setAuthCookies(response, result);

    return { user: result.user };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() request: RequestWithCookies, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.refreshSession(request.cookies?.[REFRESH_TOKEN_COOKIE]);
    this.setAuthCookies(response, result);

    return { user: result.user };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Req() request: RequestWithCookies, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.[REFRESH_TOKEN_COOKIE]);
    this.clearAuthCookies(response);

    return { ok: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.getMe(user.id);
  }

  private setAuthCookies(response: Response, session: AuthSession): void {
    response.cookie(ACCESS_TOKEN_COOKIE, session.accessToken, getAccessTokenCookieOptions(this.config));
    response.cookie(REFRESH_TOKEN_COOKIE, session.refreshToken, getRefreshTokenCookieOptions(this.config));
  }

  private clearAuthCookies(response: Response): void {
    response.clearCookie(ACCESS_TOKEN_COOKIE, toClearCookieOptions(getAccessTokenCookieOptions(this.config)));
    response.clearCookie(REFRESH_TOKEN_COOKIE, toClearCookieOptions(getRefreshTokenCookieOptions(this.config)));
  }
}

function toClearCookieOptions(options: CookieOptions): CookieOptions {
  const clearOptions = { ...options };
  delete clearOptions.maxAge;
  delete clearOptions.expires;
  return clearOptions;
}
