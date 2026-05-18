import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import type { CreateTermDto, UpdateTermDto } from "./terms.dto";

@Injectable()
export class TermsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findMany(userId: string) {
    return this.prisma.term.findMany({
      where: { userId },
      orderBy: [{ isActive: "desc" }, { startDate: "desc" }, { name: "asc" }],
    });
  }

  async findOne(userId: string, termId: string) {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, userId },
    });

    if (!term) {
      throw new NotFoundException("Term not found.");
    }

    return term;
  }

  async create(userId: string, dto: CreateTermDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isActive) {
          await tx.term.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false },
          });
        }

        return tx.term.create({
          data: {
            userId,
            name: dto.name.trim(),
            startDate: dto.startDate ? new Date(dto.startDate) : null,
            endDate: dto.endDate ? new Date(dto.endDate) : null,
            isActive: dto.isActive ?? false,
          },
        });
      });
    } catch (error) {
      handleUniqueNameConflict(error);
    }
  }

  async update(userId: string, termId: string, dto: UpdateTermDto) {
    await this.findOne(userId, termId);

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isActive) {
          await tx.term.updateMany({
            where: { userId, isActive: true, id: { not: termId } },
            data: { isActive: false },
          });
        }

        return tx.term.update({
          where: { id: termId },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.startDate !== undefined ? { startDate: dto.startDate ? new Date(dto.startDate) : null } : {}),
            ...(dto.endDate !== undefined ? { endDate: dto.endDate ? new Date(dto.endDate) : null } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          },
        });
      });
    } catch (error) {
      handleUniqueNameConflict(error);
    }
  }

  async remove(userId: string, termId: string) {
    const result = await this.prisma.term.deleteMany({
      where: { id: termId, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException("Term not found.");
    }

    return { deleted: true };
  }
}

function handleUniqueNameConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ConflictException("A term with this name already exists.");
  }

  throw error;
}
