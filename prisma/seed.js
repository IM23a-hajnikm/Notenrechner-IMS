const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const seedAccount = {
  email: "demo.student@example.test",
  password: "DemoStudent123!",
  name: "Seed Demo Student",
};

const subjects = [
  {
    key: "ma",
    name: "Mathematik",
    shortName: "MA",
    color: "#1f7a68",
    subjectType: "bms_exam_subject",
  },
  {
    key: "de",
    name: "Deutsch",
    shortName: "DE",
    color: "#2b6cb0",
    subjectType: "bms_exam_subject",
  },
  {
    key: "en",
    name: "Englisch",
    shortName: "EN",
    color: "#805ad5",
    subjectType: "bms_exam_subject",
  },
  {
    key: "wr",
    name: "Wirtschaft und Recht",
    shortName: "WR",
    color: "#d97706",
    subjectType: "bms_exam_subject",
  },
  {
    key: "finance",
    name: "Finanz- und Rechnungswesen",
    shortName: "FRW",
    color: "#c05621",
    subjectType: "bms_non_exam_subject",
  },
  {
    key: "history",
    name: "Geschichte und Politik",
    shortName: "GP",
    color: "#4a5568",
    subjectType: "bms_non_exam_subject",
  },
  {
    key: "science",
    name: "Naturwissenschaften",
    shortName: "NW",
    color: "#2f855a",
    subjectType: "bms_non_exam_subject",
  },
  {
    key: "technology",
    name: "Technik und Umwelt",
    shortName: "TU",
    color: "#319795",
    subjectType: "bms_non_exam_subject",
  },
  {
    key: "idpa-idaf",
    name: "IDPA / IDAF",
    shortName: "IDPA",
    color: "#6b46c1",
    subjectType: "bms_idpa_idaf",
  },
  {
    key: "efz-prog",
    name: "Applikationsentwicklung",
    shortName: "APP",
    color: "#2563eb",
    subjectType: "efz_school_module",
  },
  {
    key: "efz-db",
    name: "Datenbanken",
    shortName: "DB",
    color: "#0f766e",
    subjectType: "efz_school_module",
  },
  {
    key: "efz-uek",
    name: "UeK Module",
    shortName: "UeK",
    color: "#7c2d12",
    subjectType: "efz_uek_module",
  },
  {
    key: "ipa",
    name: "IPA",
    shortName: "IPA",
    color: "#be123c",
    subjectType: "custom",
  },
];

const terms = [
  {
    key: "sem-3",
    name: "3. Semester",
    startDate: "2026-02-01",
    endDate: "2026-07-10",
    isActive: true,
  },
  {
    key: "sem-2",
    name: "2. Semester",
    startDate: "2025-08-18",
    endDate: "2026-01-23",
    isActive: false,
  },
];

const grades = [
  {
    subjectKey: "ma",
    termKey: "sem-2",
    title: "Algebra Semesterprobe",
    gradeValue: 4.5,
    weight: 1,
    date: "2025-11-21",
    type: "exam",
    notes: "Zaehlt als BMS Zeugnisnote fuer Mathematik.",
  },
  {
    subjectKey: "ma",
    termKey: "sem-3",
    title: "Funktionen",
    gradeValue: 5,
    weight: 1,
    date: "2026-03-12",
    type: "exam",
  },
  {
    subjectKey: "ma",
    termKey: null,
    title: "Schriftliche Abschlusspruefung",
    gradeValue: 4.5,
    weight: 1,
    date: "2026-06-03",
    type: "written",
  },
  {
    subjectKey: "ma",
    termKey: null,
    title: "Muendliche Abschlusspruefung",
    gradeValue: 5,
    weight: 1,
    date: "2026-06-17",
    type: "oral",
  },
  {
    subjectKey: "de",
    termKey: "sem-2",
    title: "Literaturarbeit",
    gradeValue: 4,
    weight: 1,
    date: "2025-10-29",
    type: "project",
  },
  {
    subjectKey: "de",
    termKey: "sem-3",
    title: "Essay",
    gradeValue: 4.5,
    weight: 1,
    date: "2026-03-18",
    type: "project",
    notes: "Argumentation war solide, Sprache noch schaerfen.",
  },
  {
    subjectKey: "de",
    termKey: null,
    title: "Schriftliche Abschlusspruefung",
    gradeValue: 4.5,
    weight: 1,
    date: "2026-06-04",
    type: "written",
  },
  {
    subjectKey: "de",
    termKey: null,
    title: "Muendliche Abschlusspruefung",
    gradeValue: 4,
    weight: 1,
    date: "2026-06-18",
    type: "oral",
  },
  {
    subjectKey: "en",
    termKey: "sem-2",
    title: "Listening und Reading",
    gradeValue: 5,
    weight: 1,
    date: "2025-12-05",
    type: "exam",
  },
  {
    subjectKey: "en",
    termKey: "sem-3",
    title: "Presentation",
    gradeValue: 4.5,
    weight: 1,
    date: "2026-03-28",
    type: "project",
    notes: "Semesterleistung, keine Abschlusspruefung.",
  },
  {
    subjectKey: "en",
    termKey: null,
    title: "Schriftliche Abschlusspruefung",
    gradeValue: 4.5,
    weight: 1,
    date: "2026-06-05",
    type: "written",
  },
  {
    subjectKey: "en",
    termKey: null,
    title: "Muendliche Abschlusspruefung",
    gradeValue: 4.5,
    weight: 1,
    date: "2026-06-19",
    type: "oral",
  },
  {
    subjectKey: "wr",
    termKey: "sem-2",
    title: "Fallstudie",
    gradeValue: 3.75,
    weight: 1,
    date: "2025-11-12",
    type: "project",
  },
  {
    subjectKey: "wr",
    termKey: "sem-3",
    title: "Vertragsrecht Test",
    gradeValue: 4.25,
    weight: 1,
    date: "2026-04-02",
    type: "exam",
  },
  {
    subjectKey: "wr",
    termKey: null,
    title: "Schriftliche Abschlusspruefung",
    gradeValue: 4,
    weight: 1,
    date: "2026-06-08",
    type: "written",
  },
  {
    subjectKey: "wr",
    termKey: null,
    title: "Muendliche Abschlusspruefung",
    gradeValue: 4,
    weight: 1,
    date: "2026-06-20",
    type: "oral",
  },
  {
    subjectKey: "finance",
    termKey: "sem-2",
    title: "Bilanz und Erfolgsrechnung",
    gradeValue: 4,
    weight: 1,
    date: "2025-12-12",
    type: "exam",
  },
  {
    subjectKey: "finance",
    termKey: "sem-3",
    title: "Kalkulation",
    gradeValue: 4.5,
    weight: 1,
    date: "2026-04-17",
    type: "exam",
  },
  {
    subjectKey: "history",
    termKey: "sem-2",
    title: "Politische Systeme",
    gradeValue: 4.5,
    weight: 1,
    date: "2025-09-30",
    type: "exam",
  },
  {
    subjectKey: "history",
    termKey: "sem-3",
    title: "Zeitgeschichte Vortrag",
    gradeValue: 4.5,
    weight: 1,
    date: "2026-02-27",
    type: "oral",
  },
  {
    subjectKey: "science",
    termKey: "sem-2",
    title: "Laborjournal",
    gradeValue: 4.5,
    weight: 1,
    date: "2025-12-18",
    type: "project",
  },
  {
    subjectKey: "science",
    termKey: "sem-3",
    title: "Oekologie Test",
    gradeValue: 4.25,
    weight: 1,
    date: "2026-05-08",
    type: "exam",
  },
  {
    subjectKey: "technology",
    termKey: "sem-2",
    title: "Energieprojekt",
    gradeValue: 4,
    weight: 1,
    date: "2025-10-17",
    type: "project",
  },
  {
    subjectKey: "technology",
    termKey: "sem-3",
    title: "Umwelttechnik Test",
    gradeValue: 4.25,
    weight: 1,
    date: "2026-05-01",
    type: "exam",
  },
  {
    subjectKey: "idpa-idaf",
    termKey: "sem-3",
    title: "IDPA Schlussnote",
    gradeValue: 5,
    weight: 1,
    date: "2026-05-22",
    type: "project",
  },
  {
    subjectKey: "idpa-idaf",
    termKey: "sem-2",
    title: "IDAF Modul 1",
    gradeValue: 4.5,
    weight: 1,
    date: "2025-12-08",
    type: "module",
  },
  {
    subjectKey: "idpa-idaf",
    termKey: "sem-3",
    title: "IDAF Modul 2",
    gradeValue: 5,
    weight: 1,
    date: "2026-03-06",
    type: "module",
  },
  {
    subjectKey: "efz-prog",
    termKey: "sem-3",
    title: "Modul 294 Frontend",
    gradeValue: 4.5,
    weight: 1,
    date: "2026-02-20",
    type: "module",
  },
  {
    subjectKey: "efz-prog",
    termKey: "sem-3",
    title: "Modul 295 Backend",
    gradeValue: 5,
    weight: 1,
    date: "2026-04-24",
    type: "module",
  },
  {
    subjectKey: "efz-db",
    termKey: "sem-2",
    title: "Modul 164 Datenbanken",
    gradeValue: 4,
    weight: 1,
    date: "2025-11-28",
    type: "module",
  },
  {
    subjectKey: "efz-db",
    termKey: "sem-3",
    title: "Modul 141 Datenmodellierung",
    gradeValue: 4.5,
    weight: 1,
    date: "2026-05-15",
    type: "module",
  },
  {
    subjectKey: "efz-uek",
    termKey: "sem-2",
    title: "UeK Cloud Services",
    gradeValue: 5,
    weight: 1,
    date: "2025-09-26",
    type: "module",
  },
  {
    subjectKey: "efz-uek",
    termKey: "sem-3",
    title: "UeK Security",
    gradeValue: 5.5,
    weight: 1,
    date: "2026-03-20",
    type: "module",
  },
  {
    subjectKey: "ipa",
    termKey: "sem-3",
    title: "IPA Facharbeit",
    gradeValue: 4.5,
    weight: 1,
    date: "2026-06-12",
    type: "project",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(seedAccount.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: seedAccount.email },
      update: {
        name: seedAccount.name,
        passwordHash,
      },
      create: {
        email: seedAccount.email,
        name: seedAccount.name,
        passwordHash,
      },
    });

    await tx.refreshToken.deleteMany({ where: { userId: user.id } });
    await tx.grade.deleteMany({ where: { userId: user.id } });
    await tx.subject.deleteMany({ where: { userId: user.id } });
    await tx.term.deleteMany({ where: { userId: user.id } });

    const termIdsByKey = new Map();
    for (const term of terms) {
      const created = await tx.term.create({
        data: {
          userId: user.id,
          name: term.name,
          startDate: toDate(term.startDate),
          endDate: toDate(term.endDate),
          isActive: term.isActive,
        },
      });
      termIdsByKey.set(term.key, created.id);
    }

    const subjectIdsByKey = new Map();
    for (const subject of subjects) {
      const created = await tx.subject.create({
        data: {
          userId: user.id,
          name: subject.name,
          shortName: subject.shortName,
          color: subject.color,
          subjectType: subject.subjectType,
          archived: false,
        },
      });
      subjectIdsByKey.set(subject.key, created.id);
    }

    for (const grade of grades) {
      const subjectId = subjectIdsByKey.get(grade.subjectKey);
      if (!subjectId) throw new Error(`Missing seed subject: ${grade.subjectKey}`);

      const termId = grade.termKey === null ? null : termIdsByKey.get(grade.termKey);
      if (grade.termKey !== null && !termId) throw new Error(`Missing seed term: ${grade.termKey}`);

      await tx.grade.create({
        data: {
          userId: user.id,
          subjectId,
          termId,
          title: grade.title,
          gradeValue: grade.gradeValue,
          weight: grade.weight,
          date: toDate(grade.date),
          type: grade.type,
          notes: grade.notes ?? null,
        },
      });
    }

    return {
      email: user.email,
      subjectCount: subjects.length,
      termCount: terms.length,
      gradeCount: grades.length,
    };
  });

  console.log(`Seeded account: ${result.email}`);
  console.log(`Password: ${seedAccount.password}`);
  console.log(`Created ${result.subjectCount} subjects, ${result.termCount} terms, and ${result.gradeCount} grades.`);
  console.log("This is fake local sample data. Do not use these credentials in production.");
}

function toDate(value) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
