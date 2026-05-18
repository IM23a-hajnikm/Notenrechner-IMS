import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Prisma, User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHmac, randomBytes } from "node:crypto";

import { PrismaService } from "../prisma/prisma.service";
import { REFRESH_TOKEN_MAX_AGE_MS, getAccessTokenSecret, getRefreshTokenSecret } from "./auth.config";
import type { AccessTokenPayload, AuthSession, PublicUser } from "./auth.types";
import type { LoginDto, RegisterDto } from "./auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSession> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const refreshToken = this.generateRefreshToken();
    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          name: dto.name?.trim() || null,
          passwordHash,
        },
      });
      await this.createRefreshTokenRecord(tx, createdUser.id, refreshToken);
      return createdUser;
    });

    return {
      user: toPublicUser(user),
      accessToken: await this.signAccessToken(user),
      refreshToken,
    };
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const refreshToken = this.generateRefreshToken();
    await this.createRefreshTokenRecord(this.prisma, user.id, refreshToken);

    return {
      user: toPublicUser(user),
      accessToken: await this.signAccessToken(user),
      refreshToken,
    };
  }

  async refreshSession(refreshToken: string | undefined): Promise<AuthSession> {
    const tokenHash = this.getRefreshTokenHashOrThrow(refreshToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
      },
      include: {
        user: true,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const now = new Date();
    if (storedToken.expiresAt <= now) {
      await this.prisma.refreshToken.updateMany({
        where: {
          id: storedToken.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });
      throw new UnauthorizedException("Refresh token has expired.");
    }

    const nextRefreshToken = this.generateRefreshToken();
    await this.prisma.$transaction(async (tx) => {
      const revokeResult = await tx.refreshToken.updateMany({
        where: {
          id: storedToken.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      if (revokeResult.count !== 1) {
        throw new UnauthorizedException("Refresh token has already been used.");
      }

      await this.createRefreshTokenRecord(tx, storedToken.userId, nextRefreshToken);
    });

    return {
      user: toPublicUser(storedToken.user),
      accessToken: await this.signAccessToken(storedToken.user),
      refreshToken: nextRefreshToken,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("Authenticated user no longer exists.");
    }

    return toPublicUser(user);
  }

  private signAccessToken(user: Pick<User, "id" | "email">): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwt.signAsync(payload, {
      secret: getAccessTokenSecret(this.config),
      expiresIn: "1h",
    });
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString("base64url");
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHmac("sha256", getRefreshTokenSecret(this.config)).update(refreshToken).digest("hex");
  }

  private getRefreshTokenHashOrThrow(refreshToken: string | undefined): string {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token is required.");
    }

    return this.hashRefreshToken(refreshToken);
  }

  private async createRefreshTokenRecord(tx: RefreshTokenWriter, userId: string, refreshToken: string): Promise<void> {
    await tx.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
      },
    });
  }
}

type RefreshTokenWriter = Pick<Prisma.TransactionClient, "refreshToken">;

function toPublicUser(user: Pick<User, "id" | "email" | "name" | "createdAt" | "updatedAt">): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
