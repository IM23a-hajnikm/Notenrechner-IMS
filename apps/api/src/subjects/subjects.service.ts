import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import type { CreateSubjectDto, UpdateSubjectDto } from "./subjects.dto";

@Injectable()
export class SubjectsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findMany(userId: string) {
    return this.prisma.subject.findMany({
      where: { userId },
      orderBy: [{ archived: "asc" }, { name: "asc" }],
    });
  }

  async findOne(userId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId },
    });

    if (!subject) {
      throw new NotFoundException("Subject not found.");
    }

    return subject;
  }

  async create(userId: string, dto: CreateSubjectDto) {
    try {
      return await this.prisma.subject.create({
        data: {
          userId,
          name: dto.name.trim(),
          shortName: dto.shortName?.trim() || null,
          color: dto.color ?? null,
          subjectType: dto.subjectType ?? "regular",
        },
      });
    } catch (error) {
      handleUniqueNameConflict(error);
    }
  }

  async update(userId: string, subjectId: string, dto: UpdateSubjectDto) {
    await this.findOne(userId, subjectId);

    try {
      return await this.prisma.subject.update({
        where: { id: subjectId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.shortName !== undefined ? { shortName: dto.shortName?.trim() || null } : {}),
          ...(dto.color !== undefined ? { color: dto.color } : {}),
          ...(dto.subjectType !== undefined ? { subjectType: dto.subjectType } : {}),
          ...(dto.archived !== undefined ? { archived: dto.archived } : {}),
        },
      });
    } catch (error) {
      handleUniqueNameConflict(error);
    }
  }

  async remove(userId: string, subjectId: string) {
    const result = await this.prisma.subject.deleteMany({
      where: { id: subjectId, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException("Subject not found.");
    }

    return { deleted: true };
  }
}

function handleUniqueNameConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ConflictException("A subject with this name already exists.");
  }

  throw error;
}
