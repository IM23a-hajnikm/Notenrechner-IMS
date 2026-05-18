import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { GradesService } from "./grades.service";

describe("GradesService ownership checks", () => {
  it("scopes grade reads by userId", async () => {
    const prisma = {
      grade: {
        findFirst: vi.fn().mockResolvedValue({ id: "grade-1", userId: "user-1" }),
      },
    };
    const service = new GradesService(prisma as never);

    await expect(service.findOne("user-1", "grade-1")).resolves.toMatchObject({ id: "grade-1" });
    expect(prisma.grade.findFirst).toHaveBeenCalledWith({
      where: { id: "grade-1", userId: "user-1" },
      include: {
        subject: true,
        term: true,
      },
    });
  });

  it("rejects create when the subject belongs to another user", async () => {
    const prisma = {
      subject: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      term: {
        findFirst: vi.fn(),
      },
      grade: {
        create: vi.fn(),
      },
    };
    const service = new GradesService(prisma as never);

    await expect(
      service.create("user-1", {
        subjectId: "subject-user-2",
        title: "Test",
        gradeValue: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.grade.create).not.toHaveBeenCalled();
  });

  it("does not update another user's grade", async () => {
    const prisma = {
      grade: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };
    const service = new GradesService(prisma as never);

    await expect(service.update("user-1", "grade-user-2", { title: "Edited" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.grade.update).not.toHaveBeenCalled();
  });

  it("checks ownership before reassigning a grade to another subject", async () => {
    const prisma = {
      grade: {
        findFirst: vi.fn().mockResolvedValue({ id: "grade-1", userId: "user-1" }),
        update: vi.fn(),
      },
      subject: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      term: {
        findFirst: vi.fn(),
      },
    };
    const service = new GradesService(prisma as never);

    await expect(service.update("user-1", "grade-1", { subjectId: "subject-user-2" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.grade.update).not.toHaveBeenCalled();
    expect(prisma.subject.findFirst).toHaveBeenCalledWith({
      where: { id: "subject-user-2", userId: "user-1" },
      select: { id: true },
    });
  });
});
