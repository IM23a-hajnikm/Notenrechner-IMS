import type { CookieOptions, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./auth.config";
import { AuthController } from "./auth.controller";
import type { AuthSession } from "./auth.types";

describe("AuthController auth cookies", () => {
  it("sets access and refresh HTTP-only cookies on login", async () => {
    const auth = {
      login: vi.fn().mockResolvedValue(makeSession()),
    };
    const controller = makeController(auth);
    const response = makeResponse();

    await expect(
      controller.login(
        {
          email: "student@example.com",
          password: "correct-password",
        },
        response,
      ),
    ).resolves.toEqual({ user: makeSession().user });

    expect(response.cookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      "access-token",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 1000,
      }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      "refresh-token",
      expect.objectContaining({
        httpOnly: true,
        path: "/auth",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      }),
    );
  });

  it("rotates cookies through the refresh endpoint", async () => {
    const auth = {
      refreshSession: vi
        .fn()
        .mockResolvedValue(makeSession({ accessToken: "new-access", refreshToken: "new-refresh" })),
    };
    const controller = makeController(auth);
    const response = makeResponse();

    await expect(
      controller.refresh(
        {
          cookies: {
            [REFRESH_TOKEN_COOKIE]: "old-refresh",
          },
        } as never,
        response,
      ),
    ).resolves.toEqual({ user: makeSession().user });

    expect(auth.refreshSession).toHaveBeenCalledWith("old-refresh");
    expect(response.cookie).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE, "new-access", expect.any(Object));
    expect(response.cookie).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE, "new-refresh", expect.any(Object));
  });

  it("revokes refresh-token state and clears both cookies on logout", async () => {
    const auth = {
      logout: vi.fn().mockResolvedValue(undefined),
    };
    const controller = makeController(auth);
    const response = makeResponse();

    await expect(
      controller.logout(
        {
          cookies: {
            [REFRESH_TOKEN_COOKIE]: "active-refresh-token",
          },
        } as never,
        response,
      ),
    ).resolves.toEqual({ ok: true });

    expect(auth.logout).toHaveBeenCalledWith("active-refresh-token");
    expect(response.clearCookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      expect.objectContaining({
        httpOnly: true,
        path: "/",
      }),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      expect.objectContaining({
        httpOnly: true,
        path: "/auth",
      }),
    );
    expect(getCookieOptions(response.clearCookie, ACCESS_TOKEN_COOKIE)).not.toHaveProperty("maxAge");
    expect(getCookieOptions(response.clearCookie, REFRESH_TOKEN_COOKIE)).not.toHaveProperty("maxAge");
  });
});

type CookieMock = ReturnType<typeof vi.fn<(name: string, value: string, options: CookieOptions) => Response>>;
type ClearCookieMock = ReturnType<typeof vi.fn<(name: string, options: CookieOptions) => Response>>;
type ResponseMock = Response & {
  cookie: CookieMock;
  clearCookie: ClearCookieMock;
};

function makeController(auth: Partial<AuthController["auth"]>): AuthController {
  return new AuthController(
    auth as never,
    {
      get: vi.fn((key: string) => (key === "NODE_ENV" ? "test" : undefined)),
    } as never,
  );
}

function makeResponse(): ResponseMock {
  const response = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as ResponseMock;

  response.cookie.mockReturnValue(response);
  response.clearCookie.mockReturnValue(response);
  return response;
}

function makeSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    user: {
      id: "user-1",
      email: "student@example.com",
      name: "Student",
      createdAt: new Date("2026-05-18T12:00:00.000Z"),
      updatedAt: new Date("2026-05-18T12:00:00.000Z"),
    },
    accessToken: "access-token",
    refreshToken: "refresh-token",
    ...overrides,
  };
}

function getCookieOptions(mock: ClearCookieMock, cookieName: string): CookieOptions {
  const call = mock.mock.calls.find(([name]) => name === cookieName);
  if (!call) {
    throw new Error(`Expected ${cookieName} to be cleared.`);
  }

  return call[1];
}
