import { ConfigService } from "@nestjs/config";
import type { CookieOptions } from "express";

export const ACCESS_TOKEN_COOKIE = "nr_access_token";
export const REFRESH_TOKEN_COOKIE = "nr_refresh_token";
export const ACCESS_TOKEN_MAX_AGE_MS = 60 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const COOKIE_SAME_SITE_VALUES = ["lax", "strict", "none"] as const;

export function getAccessTokenSecret(config: ConfigService): string {
  const secret = config.get<string>("JWT_ACCESS_SECRET");

  if (secret) return secret;
  if (config.get<string>("NODE_ENV") === "production") {
    throw new Error("JWT_ACCESS_SECRET is required in production.");
  }

  return "dev-only-change-this-access-secret";
}

export function getRefreshTokenSecret(config: ConfigService): string {
  const secret = config.get<string>("JWT_REFRESH_SECRET");

  if (secret) return secret;
  if (config.get<string>("NODE_ENV") === "production") {
    throw new Error("JWT_REFRESH_SECRET is required in production.");
  }

  return "dev-only-change-this-refresh-secret";
}

export function getAccessTokenCookieOptions(config: ConfigService): CookieOptions {
  const baseOptions = getBaseCookieOptions(config);

  return {
    ...baseOptions,
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  };
}

export function getRefreshTokenCookieOptions(config: ConfigService): CookieOptions {
  const baseOptions = getBaseCookieOptions(config);

  return {
    ...baseOptions,
    path: "/auth",
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  };
}

function getBaseCookieOptions(config: ConfigService): CookieOptions {
  const isProduction = config.get<string>("NODE_ENV") === "production";
  const sameSite = getCookieSameSite(config);
  const domain = config.get<string>("COOKIE_DOMAIN")?.trim();

  return {
    httpOnly: true,
    secure: isProduction || sameSite === "none",
    sameSite,
    ...(domain ? { domain } : {}),
  };
}

function getCookieSameSite(config: ConfigService): CookieOptions["sameSite"] {
  const rawValue = config.get<string>("COOKIE_SAME_SITE")?.toLowerCase().trim() ?? "lax";

  if (COOKIE_SAME_SITE_VALUES.includes(rawValue as (typeof COOKIE_SAME_SITE_VALUES)[number])) {
    return rawValue as CookieOptions["sameSite"];
  }

  throw new Error("COOKIE_SAME_SITE must be one of: lax, strict, none.");
}
