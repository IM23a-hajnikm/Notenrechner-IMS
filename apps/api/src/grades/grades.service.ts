import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { CreateGradeDto, UpdateGradeDto } from "./grades.dto";

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  findMany(userId: string) {
    return this.prisma.grade.findMany({
      where: { userId },
      include: {
        subject: true,
        term: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
  }

  async findOne(userId: string, gradeId: string) {
    const grade = await this.prisma.grade.findFirst({
      where: { id: gradeId, userId },
      include: {
        subject: true,
        term: true,
      },
    });

    if (!grade) {
      throw new NotFoundException("Grade not found.");
    }

    return grade;
  }

  async create(userId: string, dto: CreateGradeDto) {
    await this.assertSubjectOwnedByUser(userId, dto.subjectId);
    await this.assertTermOwnedByUser(userId, dto.termId);

    return this.prisma.grade.create({
      data: {
        userId,
        subjectId: dto.subjectId,
        termId: dto.termId ?? null,
        title: dto.title.trim(),
        gradeValue: dto.gradeValue,
        weight: dto.weight ?? 1,
        date: dto.date ? new Date(dto.date) : null,
        type: dto.type ?? "other",
        notes: dto.notes?.trim() || null,
      },
      include: {
        subject: true,
        term: true,
      },
    });
  }

  async update(userId: string, gradeId: string, dto: UpdateGradeDto) {
    await this.findOne(userId, gradeId);

    if (dto.subjectId !== undefined) {
      await this.assertSubjectOwnedByUser(userId, dto.subjectId);
    }

    if (dto.termId !== undefined) {
      await this.assertTermOwnedByUser(userId, dto.termId);
    }

    return this.prisma.grade.update({
      where: { id: gradeId },
      data: {
        ...(dto.subjectId !== undefined ? { subjectId: dto.subjectId } : {}),
        ...(dto.termId !== undefined ? { termId: dto.termId } : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.gradeValue !== undefined ? { gradeValue: dto.gradeValue } : {}),
        ...(dto.weight !== undefined ? { weight: dto.weight } : {}),
        ...(dto.date !== undefined ? { date: dto.date ? new Date(dto.date) : null } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
      include: {
        subject: true,
        term: true,
      },
    });
  }

  async remove(userId: string, gradeId: string) {
    const result = await this.prisma.grade.deleteMany({
      where: { id: gradeId, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException("Grade not found.");
    }

    return { deleted: true };
  }

  private async assertSubjectOwnedByUser(userId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId },
      select: { id: true },
    });

    if (!subject) {
      throw new BadRequestException("Subject does not exist for this user.");
    }
  }

  private async assertTermOwnedByUser(userId: string, termId: string | null | undefined) {
    if (!termId) return;

    const term = await this.prisma.term.findFirst({
      where: { id: termId, userId },
      select: { id: true },
    });

    if (!term) {
      throw new BadRequestException("Term does not exist for this user.");
    }
  }
}
