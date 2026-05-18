import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  it("rejects requests without a cookie or bearer token", async () => {
    const guard = new JwtAuthGuard(
      { verifyAsync: vi.fn() } as never,
      { get: vi.fn((key: string) => (key === "NODE_ENV" ? "test" : undefined)) } as never,
    );

    await expect(guard.canActivate(makeContext({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("attaches the authenticated user from a valid token", async () => {
    const request = {
      headers: { authorization: "Bearer valid-token" },
    };
    const guard = new JwtAuthGuard(
      {
        verifyAsync: vi.fn().mockResolvedValue({ sub: "user-1", email: "student@example.com" }),
      } as never,
      { get: vi.fn((key: string) => (key === "NODE_ENV" ? "test" : undefined)) } as never,
    );

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(request).toMatchObject({
      user: {
        id: "user-1",
        email: "student@example.com",
      },
    });
  });
});

function makeContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as never;
}
