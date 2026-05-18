import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

import { ACCESS_TOKEN_COOKIE, getAccessTokenSecret } from "./auth.config";
import type { AccessTokenPayload, AuthenticatedUser } from "./auth.types";

type RequestWithMaybeUser = Request & {
  user?: AuthenticatedUser;
  cookies?: Record<string, string | undefined>;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService)
    private readonly jwt: JwtService,
    @Inject(ConfigService)
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithMaybeUser>();
    const token = this.getToken(request);

    if (!token) {
      throw new UnauthorizedException("Authentication is required.");
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: getAccessTokenSecret(this.config),
      });

      request.user = {
        id: payload.sub,
        email: payload.email,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired authentication token.");
    }
  }

  private getToken(request: RequestWithMaybeUser): string | null {
    const cookieToken = request.cookies?.[ACCESS_TOKEN_COOKIE];
    if (cookieToken) return cookieToken;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return null;

    return authHeader.slice("Bearer ".length);
  }
}
