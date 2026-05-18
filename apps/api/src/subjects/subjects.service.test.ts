import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { SubjectsService } from "./subjects.service";

describe("SubjectsService ownership checks", () => {
  it("scopes reads by userId", async () => {
    const prisma = {
      subject: {
        findFirst: vi.fn().mockResolvedValue({ id: "subject-1", userId: "user-1", name: "Math" }),
      },
    };
    const service = new SubjectsService(prisma as never);

    await expect(service.findOne("user-1", "subject-1")).resolves.toMatchObject({ id: "subject-1" });
    expect(prisma.subject.findFirst).toHaveBeenCalledWith({
      where: { id: "subject-1", userId: "user-1" },
    });
  });

  it("does not update another user's subject", async () => {
    const prisma = {
      subject: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };
    const service = new SubjectsService(prisma as never);

    await expect(service.update("user-1", "subject-owned-by-user-2", { name: "Math" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.subject.update).not.toHaveBeenCalled();
  });

  it("deletes only subjects scoped to the authenticated user", async () => {
    const prisma = {
      subject: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new SubjectsService(prisma as never);

    await expect(service.remove("user-1", "subject-1")).resolves.toEqual({ deleted: true });
    expect(prisma.subject.deleteMany).toHaveBeenCalledWith({
      where: { id: "subject-1", userId: "user-1" },
    });
  });
});
