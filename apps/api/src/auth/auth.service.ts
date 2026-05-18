import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import bcrypt from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service";
import { getAccessTokenSecret } from "./auth.config";
import type { AccessTokenPayload, PublicUser } from "./auth.types";
import type { LoginDto, RegisterDto } from "./auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: PublicUser; accessToken: string }> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name?.trim() || null,
        passwordHash,
      },
    });

    return {
      user: toPublicUser(user),
      accessToken: await this.signAccessToken(user),
    };
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser; accessToken: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    return {
      user: toPublicUser(user),
      accessToken: await this.signAccessToken(user),
    };
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
}

function toPublicUser(user: Pick<User, "id" | "email" | "name" | "createdAt" | "updatedAt">): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
