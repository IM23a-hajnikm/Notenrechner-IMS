import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REFRESH_TOKEN_MAX_AGE_MS } from "./auth.config";
import { AuthService } from "./auth.service";

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "hashed-password"),
    compare: vi.fn(
      async (password: string, hash: string) => password === "correct-password" && hash === "hashed-password",
    ),
  },
}));

const NOW = new Date("2026-05-18T12:00:00.000Z");

describe("AuthService refresh token lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("issues a hashed refresh token when registering", async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(makeUser());
    const service = makeService(prisma);

    const session = await service.register({
      email: " STUDENT@EXAMPLE.COM ",
      password: "correct-password",
      name: "  Student  ",
    });

    expect(session.user.email).toBe("student@example.com");
    expect(session.accessToken).toBe("access-token");
    expect(session.refreshToken).toHaveLength(64);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "student@example.com",
        name: "Student",
        passwordHash: "hashed-password",
      },
    });

    const createArgs = getFirstCallArg(prisma.refreshToken.create);
    expect(createArgs.data.userId).toBe("user-1");
    expect(createArgs.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createArgs.data.tokenHash).not.toBe(session.refreshToken);
    expect(createArgs.data.expiresAt).toEqual(new Date(NOW.getTime() + REFRESH_TOKEN_MAX_AGE_MS));
  });

  it("rejects duplicate registration before creating refresh-token state", async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(makeUser());
    const service = makeService(prisma);

    await expect(
      service.register({
        email: "student@example.com",
        password: "correct-password",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("issues a hashed refresh token when logging in", async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash: "hashed-password" }));
    const service = makeService(prisma);

    const session = await service.login({
      email: "student@example.com",
      password: "correct-password",
    });

    expect(session.accessToken).toBe("access-token");
    expect(session.refreshToken).toHaveLength(64);
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(getFirstCallArg(prisma.refreshToken.create).data.tokenHash).not.toBe(session.refreshToken);
  });

  it("rotates a valid refresh token and revokes the used token", async () => {
    const prisma = makePrisma();
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: "refresh-1",
      userId: "user-1",
      tokenHash: "stored-hash",
      expiresAt: new Date(NOW.getTime() + 60_000),
      createdAt: NOW,
      revokedAt: null,
      user: makeUser(),
    });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    const service = makeService(prisma);

    const session = await service.refreshSession("incoming-refresh-token");

    expect(session.user.id).toBe("user-1");
    expect(session.accessToken).toBe("access-token");
    expect(session.refreshToken).not.toBe("incoming-refresh-token");
    expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
      where: {
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        revokedAt: null,
      },
      include: {
        user: true,
      },
    });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: "refresh-1",
        revokedAt: null,
      },
      data: {
        revokedAt: NOW,
      },
    });
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it("rejects reused or revoked refresh tokens", async () => {
    const prisma = makePrisma();
    prisma.refreshToken.findFirst.mockResolvedValue(null);
    const service = makeService(prisma);

    await expect(service.refreshSession("reused-refresh-token")).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("rejects expired refresh tokens and records revocation", async () => {
    const prisma = makePrisma();
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: "refresh-1",
      userId: "user-1",
      tokenHash: "stored-hash",
      expiresAt: new Date(NOW.getTime() - 1),
      createdAt: NOW,
      revokedAt: null,
      user: makeUser(),
    });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    const service = makeService(prisma);

    await expect(service.refreshSession("expired-refresh-token")).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: "refresh-1",
        revokedAt: null,
      },
      data: {
        revokedAt: NOW,
      },
    });
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it("revokes the active refresh token on logout", async () => {
    const prisma = makePrisma();
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    const service = makeService(prisma);

    await service.logout("refresh-token");

    const updateArgs = getFirstCallArg(prisma.refreshToken.updateMany);
    expect(updateArgs.where).toEqual({
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      revokedAt: null,
    });
    expect(updateArgs.where.tokenHash).not.toBe("refresh-token");
    expect(updateArgs.data).toEqual({
      revokedAt: NOW,
    });
  });
});

type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type RefreshTokenCreateArgs = {
  data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  };
};

type RefreshTokenUpdateManyArgs = {
  where: Record<string, unknown>;
  data: {
    revokedAt: Date;
  };
};

type MockFunction<Args extends unknown[], Return> = ReturnType<typeof vi.fn<(...args: Args) => Return>>;
type TransactionCallback = (tx: MockPrisma) => Promise<unknown>;

type MockPrisma = {
  user: {
    findUnique: MockFunction<[unknown], Promise<UserRecord | null>>;
    create: MockFunction<[unknown], Promise<UserRecord>>;
  };
  refreshToken: {
    create: MockFunction<[RefreshTokenCreateArgs], Promise<unknown>>;
    findFirst: MockFunction<[unknown], Promise<unknown>>;
    updateMany: MockFunction<[RefreshTokenUpdateManyArgs], Promise<{ count: number }>>;
  };
  $transaction: MockFunction<[TransactionCallback], Promise<unknown>>;
};

function makePrisma(): MockPrisma {
  const prisma = {
    user: {
      findUnique: vi.fn<(args: unknown) => Promise<UserRecord | null>>(),
      create: vi.fn<(args: unknown) => Promise<UserRecord>>(),
    },
    refreshToken: {
      create: vi.fn<(args: RefreshTokenCreateArgs) => Promise<unknown>>().mockResolvedValue({}),
      findFirst: vi.fn<(args: unknown) => Promise<unknown>>(),
      updateMany: vi.fn<(args: RefreshTokenUpdateManyArgs) => Promise<{ count: number }>>(),
    },
    $transaction: vi.fn<(txCallback: TransactionCallback) => Promise<unknown>>(),
  };

  prisma.$transaction.mockImplementation(async (txCallback) => txCallback(prisma));
  return prisma;
}

function makeService(prisma: MockPrisma): AuthService {
  return new AuthService(
    prisma as never,
    {
      signAsync: vi.fn().mockResolvedValue("access-token"),
    } as never,
    {
      get: vi.fn((key: string) => {
        if (key === "JWT_ACCESS_SECRET") return "test-access-secret";
        if (key === "JWT_REFRESH_SECRET") return "test-refresh-secret";
        if (key === "NODE_ENV") return "test";
        return undefined;
      }),
    } as never,
  );
}

function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "user-1",
    email: "student@example.com",
    name: "Student",
    passwordHash: "hashed-password",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function getFirstCallArg<Args extends unknown[], Return>(mock: MockFunction<Args, Return>): Args[0] {
  const firstCall = mock.mock.calls[0];
  if (!firstCall) {
    throw new Error("Expected mock to be called.");
  }

  return firstCall[0];
}
