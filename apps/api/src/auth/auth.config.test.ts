import { describe, expect, it, vi } from "vitest";

import {
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getRefreshTokenSecret,
} from "./auth.config";

describe("auth config", () => {
  it("uses secure, HTTP-only cookie options in production", () => {
    const config = {
      get: vi.fn((key: string) => (key === "NODE_ENV" ? "production" : undefined)),
    };

    expect(getAccessTokenCookieOptions(config as never)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    });
    expect(getRefreshTokenCookieOptions(config as never)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/auth",
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });
  });

  it("fails closed when JWT_REFRESH_SECRET is missing in production", () => {
    const config = {
      get: vi.fn((key: string) => (key === "NODE_ENV" ? "production" : undefined)),
    };

    expect(() => getRefreshTokenSecret(config as never)).toThrow("JWT_REFRESH_SECRET is required in production.");
  });
});
