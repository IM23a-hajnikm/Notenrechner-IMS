import { ConfigService } from "@nestjs/config";
import type { CookieOptions } from "express";

export const ACCESS_TOKEN_COOKIE = "nr_access_token";

export function getAccessTokenSecret(config: ConfigService): string {
  const secret = config.get<string>("JWT_ACCESS_SECRET");

  if (secret) return secret;
  if (config.get<string>("NODE_ENV") === "production") {
    throw new Error("JWT_ACCESS_SECRET is required in production.");
  }

  return "dev-only-change-this-access-secret";
}

export function getAccessTokenCookieOptions(config: ConfigService): CookieOptions {
  const isProduction = config.get<string>("NODE_ENV") === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 1000,
  };
}
