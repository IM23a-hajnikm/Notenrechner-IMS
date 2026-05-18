import "reflect-metadata";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppModule } from "./app.module";
import { PrismaService } from "./prisma/prisma.service";

describe("API endpoints", () => {
  let app: INestApplication | undefined;
  let prisma: InMemoryPrisma;

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = "api-test-access-secret";
    process.env.JWT_REFRESH_SECRET = "api-test-refresh-secret";
    process.env.NODE_ENV = "test";

    prisma = new InMemoryPrisma();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("serves health and calculation endpoints without authentication", async () => {
    const server = getServer(app);
    await request(server).get("/health").expect(200).expect({ status: "ok" });

    await request(server)
      .post("/calculations/weighted-average")
      .send({
        items: [
          { value: 5, weight: 1 },
          { value: 4, weight: 1 },
        ],
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          average: 4.5,
          semesterGrade: 4.5,
        });
      });

    await request(server)
      .post("/calculations/required-grade")
      .send({
        currentItems: [{ value: 4, weight: 1 }],
        upcomingWeight: 1,
        targetExactAverage: 4.5,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.requiredGrade).toBe(5);
      });

    await request(server)
      .post("/calculations/bms")
      .send({
        subjects: Array.from({ length: 9 }, (_, index) => ({
          name: `Subject ${index + 1}`,
          kind: "non_exam",
          semesterGrades: [4.5],
        })),
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          isComplete: true,
          overallAverage: 4.5,
          passed: true,
        });
      });

    await request(server)
      .post("/calculations/efz")
      .send({
        schoolModules: [4, 4.5, 5, 4],
        uekModules: [5, 5.5],
        ipaGrade: 4,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          schoolAverage: 4.5,
          uekAverage: 5.5,
          erfahrungsnote: 4.7,
          passed: true,
        });
      });
  });

  it("sets auth cookies, protects routes, refreshes sessions, and revokes logout sessions", async () => {
    const server = getServer(app);
    const agent = request.agent(server);

    await request(server).get("/subjects").expect(401);

    await agent
      .post("/auth/register")
      .send({
        email: "student@example.com",
        password: "correct-password",
        name: "Student",
      })
      .expect(201)
      .expect(({ body, headers }) => {
        expect(body.user).toMatchObject({
          email: "student@example.com",
          name: "Student",
        });
        expect(headers["set-cookie"]).toEqual(
          expect.arrayContaining([
            expect.stringContaining("nr_access_token="),
            expect.stringContaining("nr_refresh_token="),
          ]),
        );
      });

    await agent
      .get("/auth/me")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          email: "student@example.com",
          name: "Student",
        });
      });

    await agent
      .post("/auth/refresh")
      .expect(200)
      .expect(({ headers }) => {
        expect(headers["set-cookie"]).toEqual(
          expect.arrayContaining([
            expect.stringContaining("nr_access_token="),
            expect.stringContaining("nr_refresh_token="),
          ]),
        );
      });
    expect(prisma.refreshTokens).toHaveLength(2);
    expect(prisma.refreshTokens.filter((token) => token.revokedAt !== null)).toHaveLength(1);

    await agent.post("/auth/logout").expect(200).expect({ ok: true });
    expect(prisma.refreshTokens.every((token) => token.revokedAt !== null)).toBe(true);
  });

  it("supports authenticated subject, term, and grade CRUD", async () => {
    const agent = request.agent(getServer(app));
    await registerAccount(agent, "crud@example.com");

    const subjectId = await agent
      .post("/subjects")
      .send({
        name: "Mathematik",
        shortName: "MA",
        color: "#3366ff",
        subjectType: "regular",
      })
      .expect(201)
      .then(({ body }) => {
        expect(body).toMatchObject({
          name: "Mathematik",
          shortName: "MA",
        });
        return body.id as string;
      });

    const termId = await agent
      .post("/terms")
      .send({
        name: "Semester 1",
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        isActive: true,
      })
      .expect(201)
      .then(({ body }) => {
        expect(body).toMatchObject({
          name: "Semester 1",
          isActive: true,
        });
        return body.id as string;
      });

    const gradeId = await agent
      .post("/grades")
      .send({
        subjectId,
        termId,
        title: "Pruefung 1",
        gradeValue: 5,
        weight: 2,
        date: "2026-03-15",
        type: "exam",
        notes: "Good work",
      })
      .expect(201)
      .then(({ body }) => {
        expect(body).toMatchObject({
          title: "Pruefung 1",
          gradeValue: 5,
          weight: 2,
          subject: {
            id: subjectId,
          },
          term: {
            id: termId,
          },
        });
        return body.id as string;
      });

    await agent
      .get("/subjects")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({ id: subjectId });
      });
    await agent
      .patch(`/subjects/${subjectId}`)
      .send({ archived: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body.archived).toBe(true);
      });

    await agent
      .get("/terms")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({ id: termId });
      });
    await agent
      .patch(`/terms/${termId}`)
      .send({ name: "Semester 1 edited" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.name).toBe("Semester 1 edited");
      });

    await agent
      .get("/grades")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({ id: gradeId });
      });
    await agent
      .patch(`/grades/${gradeId}`)
      .send({ gradeValue: 5.5 })
      .expect(200)
      .expect(({ body }) => {
        expect(body.gradeValue).toBe(5.5);
      });

    await agent.delete(`/grades/${gradeId}`).expect(200).expect({ deleted: true });
    await agent.delete(`/terms/${termId}`).expect(200).expect({ deleted: true });
    await agent.delete(`/subjects/${subjectId}`).expect(200).expect({ deleted: true });
  });

  it("prevents cross-user reads and mutations for subjects, terms, and grades", async () => {
    const server = getServer(app);
    const owner = request.agent(server);
    const outsider = request.agent(server);
    await registerAccount(owner, "owner@example.com");
    await registerAccount(outsider, "outsider@example.com");

    const subjectId = await owner
      .post("/subjects")
      .send({ name: "Wirtschaft", subjectType: "regular" })
      .expect(201)
      .then(({ body }) => body.id as string);
    const termId = await owner
      .post("/terms")
      .send({ name: "Semester 2" })
      .expect(201)
      .then(({ body }) => body.id as string);
    const gradeId = await owner
      .post("/grades")
      .send({
        subjectId,
        termId,
        title: "Owner grade",
        gradeValue: 4.5,
      })
      .expect(201)
      .then(({ body }) => body.id as string);

    await outsider.get(`/subjects/${subjectId}`).expect(404);
    await outsider.patch(`/subjects/${subjectId}`).send({ name: "Stolen" }).expect(404);
    await outsider.delete(`/subjects/${subjectId}`).expect(404);

    await outsider.get(`/terms/${termId}`).expect(404);
    await outsider.patch(`/terms/${termId}`).send({ name: "Stolen" }).expect(404);
    await outsider.delete(`/terms/${termId}`).expect(404);

    await outsider.get(`/grades/${gradeId}`).expect(404);
    await outsider.patch(`/grades/${gradeId}`).send({ title: "Stolen" }).expect(404);
    await outsider.delete(`/grades/${gradeId}`).expect(404);

    await outsider
      .post("/grades")
      .send({
        subjectId,
        termId,
        title: "Cross-user grade",
        gradeValue: 5,
      })
      .expect(400);

    await owner.get(`/subjects/${subjectId}`).expect(200);
    await owner.get(`/terms/${termId}`).expect(200);
    await owner.get(`/grades/${gradeId}`).expect(200);
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

type RefreshTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
};

type SubjectRecord = {
  id: string;
  userId: string;
  name: string;
  shortName: string | null;
  color: string | null;
  subjectType: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TermRecord = {
  id: string;
  userId: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type GradeRecord = {
  id: string;
  userId: string;
  subjectId: string;
  termId: string | null;
  title: string;
  gradeValue: number;
  weight: number;
  date: Date | null;
  type: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

class InMemoryPrisma {
  readonly users: UserRecord[] = [];
  readonly refreshTokens: RefreshTokenRecord[] = [];
  readonly subjects: SubjectRecord[] = [];
  readonly terms: TermRecord[] = [];
  readonly grades: GradeRecord[] = [];

  private nextId = 1;

  readonly user = {
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) =>
      this.users.find((user) => user.id === where.id || user.email === where.email) ?? null,
    create: async ({ data }: { data: Pick<UserRecord, "email" | "name" | "passwordHash"> }) => {
      const user = {
        id: this.createId("user"),
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.push(user);
      return user;
    },
  };

  readonly refreshToken = {
    create: async ({ data }: { data: Pick<RefreshTokenRecord, "userId" | "tokenHash" | "expiresAt"> }) => {
      const token = {
        id: this.createId("refresh"),
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        createdAt: new Date(),
        revokedAt: null,
      };
      this.refreshTokens.push(token);
      return token;
    },
    findFirst: async ({
      where,
      include,
    }: {
      where: Partial<Pick<RefreshTokenRecord, "id" | "tokenHash" | "revokedAt">>;
      include?: { user?: boolean };
    }) => {
      const token = this.refreshTokens.find((candidate) => matchesWhere(candidate, where));
      if (!token || !include?.user) return token ?? null;

      return {
        ...token,
        user: this.users.find((user) => user.id === token.userId) ?? null,
      };
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: Partial<Pick<RefreshTokenRecord, "id" | "tokenHash" | "revokedAt">>;
      data: Partial<Pick<RefreshTokenRecord, "revokedAt">>;
    }) => updateMany(this.refreshTokens, where, data),
  };

  readonly subject = {
    findMany: async ({ where }: { where: Partial<Pick<SubjectRecord, "userId" | "archived">> }) =>
      this.subjects
        .filter((subject) => matchesWhere(subject, where))
        .sort((left, right) => Number(left.archived) - Number(right.archived) || left.name.localeCompare(right.name)),
    findFirst: async ({ where }: { where: Partial<Pick<SubjectRecord, "id" | "userId">> }) =>
      this.subjects.find((subject) => matchesWhere(subject, where)) ?? null,
    create: async ({ data }: { data: Omit<SubjectRecord, "id" | "archived" | "createdAt" | "updatedAt"> }) => {
      const subject = {
        id: this.createId("subject"),
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      this.subjects.push(subject);
      return subject;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<SubjectRecord> }) => {
      const subject = requireRecord(this.subjects, where.id, "subject");
      Object.assign(subject, data, { updatedAt: new Date() });
      return subject;
    },
    deleteMany: async ({ where }: { where: Partial<Pick<SubjectRecord, "id" | "userId">> }) =>
      deleteMany(this.subjects, where),
  };

  readonly term = {
    findMany: async ({ where }: { where: Partial<Pick<TermRecord, "userId" | "isActive">> }) =>
      this.terms
        .filter((term) => matchesWhere(term, where))
        .sort((left, right) => Number(right.isActive) - Number(left.isActive) || right.name.localeCompare(left.name)),
    findFirst: async ({ where }: { where: Partial<Pick<TermRecord, "id" | "userId">> }) =>
      this.terms.find((term) => matchesWhere(term, where)) ?? null,
    create: async ({ data }: { data: Omit<TermRecord, "id" | "createdAt" | "updatedAt"> }) => {
      const term = {
        id: this.createId("term"),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      this.terms.push(term);
      return term;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<TermRecord> }) => {
      const term = requireRecord(this.terms, where.id, "term");
      Object.assign(term, data, { updatedAt: new Date() });
      return term;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: Partial<Pick<TermRecord, "id" | "userId" | "isActive">> & { id?: string | { not: string } };
      data: Partial<TermRecord>;
    }) => updateMany(this.terms, where, data),
    deleteMany: async ({ where }: { where: Partial<Pick<TermRecord, "id" | "userId">> }) =>
      deleteMany(this.terms, where),
  };

  readonly grade = {
    findMany: async ({ where }: { where: Partial<Pick<GradeRecord, "userId">> }) =>
      this.grades.filter((grade) => matchesWhere(grade, where)).map((grade) => this.withGradeRelations(grade)),
    findFirst: async ({ where }: { where: Partial<Pick<GradeRecord, "id" | "userId">> }) => {
      const grade = this.grades.find((candidate) => matchesWhere(candidate, where));
      return grade ? this.withGradeRelations(grade) : null;
    },
    create: async ({ data }: { data: Omit<GradeRecord, "id" | "createdAt" | "updatedAt"> }) => {
      const grade = {
        id: this.createId("grade"),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      this.grades.push(grade);
      return this.withGradeRelations(grade);
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<GradeRecord> }) => {
      const grade = requireRecord(this.grades, where.id, "grade");
      Object.assign(grade, data, { updatedAt: new Date() });
      return this.withGradeRelations(grade);
    },
    deleteMany: async ({ where }: { where: Partial<Pick<GradeRecord, "id" | "userId">> }) =>
      deleteMany(this.grades, where),
  };

  async $transaction<T>(callback: (tx: InMemoryPrisma) => Promise<T>): Promise<T> {
    return callback(this);
  }

  async $connect(): Promise<void> {}

  async $disconnect(): Promise<void> {}

  private createId(prefix: string): string {
    const id = `${prefix}-${this.nextId}`;
    this.nextId += 1;
    return id;
  }

  private withGradeRelations(grade: GradeRecord) {
    return {
      ...grade,
      subject: this.subjects.find((subject) => subject.id === grade.subjectId) ?? null,
      term: grade.termId ? (this.terms.find((term) => term.id === grade.termId) ?? null) : null,
    };
  }
}

async function registerAccount(agent: ReturnType<typeof request.agent>, email: string) {
  await agent
    .post("/auth/register")
    .send({
      email,
      password: "correct-password",
      name: email.split("@")[0],
    })
    .expect(201);
}

function getServer(app: INestApplication | undefined) {
  if (!app) {
    throw new Error("Expected test app to be initialized.");
  }

  return app.getHttpServer();
}

function matchesWhere<T extends object>(record: T, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, expected]) => {
    const actual = (record as Record<string, unknown>)[key];
    if (isNotCondition(expected)) return actual !== expected.not;
    return actual === expected;
  });
}

function isNotCondition(value: unknown): value is { not: unknown } {
  return typeof value === "object" && value !== null && "not" in value;
}

function updateMany<T extends { id: string }>(
  records: T[],
  where: Record<string, unknown>,
  data: object,
): { count: number } {
  let count = 0;
  for (const record of records) {
    if (!matchesWhere(record, where)) continue;
    Object.assign(record, data);
    count += 1;
  }
  return { count };
}

function deleteMany<T extends { id: string }>(records: T[], where: Record<string, unknown>): { count: number } {
  const originalLength = records.length;
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index];
    if (record && matchesWhere(record, where)) {
      records.splice(index, 1);
    }
  }
  return { count: originalLength - records.length };
}

function requireRecord<T extends { id: string }>(records: T[], id: string, label: string): T {
  const record = records.find((candidate) => candidate.id === id);
  if (!record) throw new Error(`Missing ${label} ${id}.`);
  return record;
}
