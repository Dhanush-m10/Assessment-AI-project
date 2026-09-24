/**
 * Additive, idempotent content seeder.
 *
 * Tops up an ALREADY-POPULATED database (e.g. the Supabase dev database)
 * with the canonical content/configuration dataset from prisma/seed-data.ts —
 * the exact same arrays prisma/seed.ts loads into a fresh database — without
 * wiping anything. One source of truth, two loaders (option C).
 *
 *   npm run db:seed-content        (from apps/web; needs DATABASE_URL)
 *
 * Hard guarantees:
 *  - Writes ONLY content/configuration tables: Category, AreaOfInterest,
 *    JobTitle, Skill, JobDescription, Question, CodingQuestion and their
 *    option / test-case / join rows.
 *  - NEVER writes or deletes Assessment, AssessmentQuestion, AssessmentSkill,
 *    UserAnswer, UserQuestionHistory or AdminProfile rows. Their counts are
 *    verified before/after every run; any change aborts with an error.
 *  - NO deletes anywhere. Rows are matched first by deterministic seed id,
 *    then by natural unique key (slug / normalizedName / name), so rows an
 *    admin created through the UI (generated cuids, same natural key) are
 *    UPDATED IN PLACE under their existing id instead of causing a unique
 *    constraint violation. Children always attach to the ACTUAL database id.
 *  - A matched row is updated only when a canonical field differs; identical
 *    rows are left untouched. Consecutive runs therefore report
 *    0 created / 0 updated (idempotent).
 *  - Fields the canonical dataset does not define are never overwritten:
 *    Skill.isActive and CodingQuestion.constraints keep their current value.
 *    Extra QuestionOption rows / CodingTestCase rows / join rows that are not
 *    in the canonical set are PRESERVED (counted as "left as-is"), never
 *    deleted — deletion could break Restrict FKs from UserAnswer or alter
 *    content an admin added on purpose.
 *  - Every canonical MCQ is asserted to have exactly one correct option
 *    (the same invariant lib/assessment/snapshot.ts enforces at serve time).
 *
 * This is a data loader, not a migration: no schema change, no engine change.
 * Fresh database? Use `npm run db:seed` (prisma/seed.ts) instead.
 */
import { PrismaClient } from "@prisma/client";
import {
  areas,
  bandLabel,
  categories,
  codings,
  jds,
  jobTitles,
  jobTitleSkills,
  mcqs,
  norm,
  skillId,
  skills,
  slug,
} from "./seed-data";

export type Tally = {
  created: number;
  updated: number;
  unchanged: number;
  /** Existing rows not present in the canonical set; preserved, never deleted. */
  leftAsIs?: number;
};

export type JoinTally = { created: number; alreadyLinked: number };

export type ContentSeedReport = {
  tables: Record<string, Tally>;
  joins: Record<string, JoinTally>;
  protectedCounts: Record<string, { before: number; after: number }>;
};

const TABLES = [
  "Category",
  "AreaOfInterest",
  "JobTitle",
  "Skill",
  "JobDescription",
  "Question",
  "QuestionOption",
  "CodingQuestion",
  "CodingTestCase",
] as const;

const JOIN_TABLES = [
  "JobTitleSkill",
  "JobDescriptionSkill",
  "QuestionSkill",
  "QuestionArea",
  "QuestionJobTitle",
  "CodingQuestionSkill",
  "CodingQuestionJobTitle",
] as const;

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) {
    throw new Error(`Content seed reference missing: ${what}`);
  }
  return value;
}

/** Tables this script must never touch (assessment + user/auth data). */
async function countProtected(prisma: PrismaClient) {
  return {
    Assessment: await prisma.assessment.count(),
    AssessmentQuestion: await prisma.assessmentQuestion.count(),
    AssessmentSkill: await prisma.assessmentSkill.count(),
    UserAnswer: await prisma.userAnswer.count(),
    UserQuestionHistory: await prisma.userQuestionHistory.count(),
    AdminProfile: await prisma.adminProfile.count(),
  };
}

export async function runContentSeed(prisma: PrismaClient): Promise<ContentSeedReport> {
  const tables: Record<string, Tally> = Object.fromEntries(
    TABLES.map((t) => [t, { created: 0, updated: 0, unchanged: 0 }]),
  );
  const joins: Record<string, JoinTally> = Object.fromEntries(
    JOIN_TABLES.map((j) => [j, { created: 0, alreadyLinked: 0 }]),
  );
  const protectedBefore = await countProtected(prisma);

  // Canonical seed id -> ACTUAL database id (differs when a row was matched
  // by natural key but originally created with a generated cuid).
  const categoryId = new Map<string, string>();
  const areaId = new Map<string, string>();
  const jobTitleId = new Map<string, string>();
  const skillDbId = new Map<string, string>(); // canonical skill NAME -> actual id

  // ---------------------------------------------------------------- Category
  for (const c of categories) {
    const data = { name: c.name, slug: slug(c.name), kind: c.kind, status: c.status };
    const existing = await prisma.category.findFirst({
      where: { OR: [{ id: c.id }, { slug: data.slug }] },
    });
    if (!existing) {
      await prisma.category.create({ data: { id: c.id, ...data } });
      categoryId.set(c.id, c.id);
      tables.Category.created += 1;
    } else {
      categoryId.set(c.id, existing.id);
      if (
        existing.name !== data.name ||
        existing.slug !== data.slug ||
        existing.kind !== data.kind ||
        existing.status !== data.status
      ) {
        await prisma.category.update({ where: { id: existing.id }, data });
        tables.Category.updated += 1;
      } else {
        tables.Category.unchanged += 1;
      }
    }
  }

  // ------------------------------------------------------------ AreaOfInterest
  for (const a of areas) {
    const data = {
      categoryId: need(categoryId.get(a.categoryId), `category ${a.categoryId}`),
      name: a.name,
      slug: slug(a.name),
      classification: a.classification,
      status: a.status,
    };
    const existing = await prisma.areaOfInterest.findFirst({
      where: { OR: [{ id: a.id }, { slug: data.slug }] },
    });
    if (!existing) {
      await prisma.areaOfInterest.create({ data: { id: a.id, ...data } });
      areaId.set(a.id, a.id);
      tables.AreaOfInterest.created += 1;
    } else {
      areaId.set(a.id, existing.id);
      if (
        existing.categoryId !== data.categoryId ||
        existing.name !== data.name ||
        existing.slug !== data.slug ||
        existing.classification !== data.classification ||
        existing.status !== data.status
      ) {
        await prisma.areaOfInterest.update({ where: { id: existing.id }, data });
        tables.AreaOfInterest.updated += 1;
      } else {
        tables.AreaOfInterest.unchanged += 1;
      }
    }
  }

  // ---------------------------------------------------------------- JobTitle
  for (const t of jobTitles) {
    const data = {
      areaOfInterestId: need(areaId.get(t.areaOfInterestId), `area ${t.areaOfInterestId}`),
      name: t.name,
      slug: slug(t.name),
      assessmentFlow: t.assessmentFlow,
      status: t.status,
    };
    const existing = await prisma.jobTitle.findFirst({
      where: { OR: [{ id: t.id }, { slug: data.slug }] },
    });
    if (!existing) {
      await prisma.jobTitle.create({ data: { id: t.id, ...data } });
      jobTitleId.set(t.id, t.id);
      tables.JobTitle.created += 1;
    } else {
      jobTitleId.set(t.id, existing.id);
      if (
        existing.areaOfInterestId !== data.areaOfInterestId ||
        existing.name !== data.name ||
        existing.slug !== data.slug ||
        existing.assessmentFlow !== data.assessmentFlow ||
        existing.status !== data.status
      ) {
        await prisma.jobTitle.update({ where: { id: existing.id }, data });
        tables.JobTitle.updated += 1;
      } else {
        tables.JobTitle.unchanged += 1;
      }
    }
  }

  // ------------------------------------------------------------------- Skill
  // isActive is an admin decision the canonical dataset does not define:
  // it is set on create (schema default true) and NEVER overwritten.
  for (const s of skills) {
    const data = { name: s, normalizedName: norm(s), slug: slug(s) };
    const existing = await prisma.skill.findFirst({
      where: {
        OR: [
          { id: skillId(s) },
          { normalizedName: data.normalizedName },
          { slug: data.slug },
          { name: data.name },
        ],
      },
    });
    if (!existing) {
      await prisma.skill.create({ data: { id: skillId(s), ...data } });
      skillDbId.set(s, skillId(s));
      tables.Skill.created += 1;
    } else {
      skillDbId.set(s, existing.id);
      if (
        existing.name !== data.name ||
        existing.normalizedName !== data.normalizedName ||
        existing.slug !== data.slug
      ) {
        await prisma.skill.update({ where: { id: existing.id }, data });
        tables.Skill.updated += 1;
      } else {
        tables.Skill.unchanged += 1;
      }
    }
  }

  // ----------------------------------------------------------- JobTitleSkill
  for (const [jtId, names] of Object.entries(jobTitleSkills)) {
    const rows = names.map((n) => ({
      jobTitleId: need(jobTitleId.get(jtId), `job title ${jtId}`),
      skillId: need(skillDbId.get(n), `skill ${n}`),
    }));
    const res = await prisma.jobTitleSkill.createMany({ data: rows, skipDuplicates: true });
    joins.JobTitleSkill.created += res.count;
    joins.JobTitleSkill.alreadyLinked += rows.length - res.count;
  }

  // ---------------------------------------------------------- JobDescription
  for (const jd of jds) {
    const data = {
      jobTitleId: need(jobTitleId.get(jd.jobTitleId), `job title ${jd.jobTitleId}`),
      title: `${jobTitles.find((t) => t.id === jd.jobTitleId)!.name} – ${bandLabel[jd.band]}`,
      content: jd.content,
      experienceBand: jd.band,
      source: jd.source,
      status: jd.status,
    };
    const existing = await prisma.jobDescription.findUnique({ where: { id: jd.id } });
    if (!existing) {
      await prisma.jobDescription.create({ data: { id: jd.id, ...data } });
      tables.JobDescription.created += 1;
    } else {
      if (
        existing.jobTitleId !== data.jobTitleId ||
        existing.title !== data.title ||
        existing.content !== data.content ||
        existing.experienceBand !== data.experienceBand ||
        existing.source !== data.source ||
        existing.status !== data.status
      ) {
        await prisma.jobDescription.update({ where: { id: jd.id }, data });
        tables.JobDescription.updated += 1;
      } else {
        tables.JobDescription.unchanged += 1;
      }
    }
    const skillRows = jd.skills.map((n) => ({
      jobDescriptionId: jd.id,
      skillId: need(skillDbId.get(n), `skill ${n}`),
    }));
    const res = await prisma.jobDescriptionSkill.createMany({
      data: skillRows,
      skipDuplicates: true,
    });
    joins.JobDescriptionSkill.created += res.count;
    joins.JobDescriptionSkill.alreadyLinked += skillRows.length - res.count;
  }

  // ------------------------------------------------------- Question (MCQ)
  for (const q of mcqs) {
    const correctCount = q.options.filter((o) => o.correct).length;
    if (correctCount !== 1) {
      throw new Error(
        `Seed question ${q.id} must have exactly one correct option (found ${correctCount}).`,
      );
    }
    const data = {
      questionText: q.text,
      difficulty: q.difficulty,
      assessmentFlow: q.flow,
      status: q.status ?? "LIVE",
    };
    const existing = await prisma.question.findUnique({ where: { id: q.id } });
    if (!existing) {
      await prisma.question.create({ data: { id: q.id, ...data } });
      tables.Question.created += 1;
    } else {
      if (
        existing.questionText !== data.questionText ||
        existing.difficulty !== data.difficulty ||
        existing.assessmentFlow !== data.assessmentFlow ||
        existing.status !== data.status
      ) {
        await prisma.question.update({ where: { id: q.id }, data });
        tables.Question.updated += 1;
      } else {
        tables.Question.unchanged += 1;
      }
    }

    // Options: matched by (questionId, position). isCorrect is synced to the
    // canonical key so the exactly-one-correct invariant always holds after a
    // run. Options at positions beyond the canonical set are preserved.
    const existingOptions = await prisma.questionOption.findMany({
      where: { questionId: q.id },
      orderBy: { position: "asc" },
    });
    tables.QuestionOption.leftAsIs =
      (tables.QuestionOption.leftAsIs ?? 0) +
      existingOptions.filter((eo) => eo.position >= q.options.length).length;
    for (let i = 0; i < q.options.length; i += 1) {
      const want = { text: q.options[i].text, isCorrect: !!q.options[i].correct };
      const cur = existingOptions.find((eo) => eo.position === i);
      if (!cur) {
        await prisma.questionOption.create({ data: { questionId: q.id, position: i, ...want } });
        tables.QuestionOption.created += 1;
      } else if (cur.text !== want.text || cur.isCorrect !== want.isCorrect) {
        await prisma.questionOption.update({ where: { id: cur.id }, data: want });
        tables.QuestionOption.updated += 1;
      } else {
        tables.QuestionOption.unchanged += 1;
      }
    }

    if (q.skills) {
      const rows = q.skills.map((n) => ({
        questionId: q.id,
        skillId: need(skillDbId.get(n), `skill ${n}`),
      }));
      const res = await prisma.questionSkill.createMany({ data: rows, skipDuplicates: true });
      joins.QuestionSkill.created += res.count;
      joins.QuestionSkill.alreadyLinked += rows.length - res.count;
    }
    if (q.areaId) {
      const rows = [
        { questionId: q.id, areaOfInterestId: need(areaId.get(q.areaId), `area ${q.areaId}`) },
      ];
      const res = await prisma.questionArea.createMany({ data: rows, skipDuplicates: true });
      joins.QuestionArea.created += res.count;
      joins.QuestionArea.alreadyLinked += rows.length - res.count;
    }
    if (q.jobTitleId) {
      const rows = [
        {
          questionId: q.id,
          jobTitleId: need(jobTitleId.get(q.jobTitleId), `job title ${q.jobTitleId}`),
        },
      ];
      const res = await prisma.questionJobTitle.createMany({ data: rows, skipDuplicates: true });
      joins.QuestionJobTitle.created += res.count;
      joins.QuestionJobTitle.alreadyLinked += rows.length - res.count;
    }
  }

  // --------------------------------------------------------- CodingQuestion
  for (const c of codings) {
    // constraints is not part of the canonical dataset: never overwritten.
    const data = {
      title: c.title,
      problemStatement: c.problem,
      difficulty: c.difficulty,
      language: c.language,
      starterCode: c.starter,
      status: c.status ?? "LIVE",
    };
    const existing = await prisma.codingQuestion.findUnique({ where: { id: c.id } });
    if (!existing) {
      await prisma.codingQuestion.create({ data: { id: c.id, ...data } });
      tables.CodingQuestion.created += 1;
    } else {
      if (
        existing.title !== data.title ||
        existing.problemStatement !== data.problemStatement ||
        existing.difficulty !== data.difficulty ||
        existing.language !== data.language ||
        existing.starterCode !== data.starterCode ||
        existing.status !== data.status
      ) {
        await prisma.codingQuestion.update({ where: { id: c.id }, data });
        tables.CodingQuestion.updated += 1;
      } else {
        tables.CodingQuestion.unchanged += 1;
      }
    }

    // Test cases: no natural unique key exists, so canonical cases are matched
    // by their stdin `input` within this question. Cases with inputs outside
    // the canonical set are preserved (never deleted).
    const existingTests = await prisma.codingTestCase.findMany({
      where: { codingQuestionId: c.id },
    });
    tables.CodingTestCase.leftAsIs =
      (tables.CodingTestCase.leftAsIs ?? 0) +
      existingTests.filter((et) => !c.tests.some((t) => t.input === et.input)).length;
    for (const t of c.tests) {
      const want = { expectedOutput: t.expected, visibility: t.visibility };
      const cur = existingTests.find((et) => et.input === t.input);
      if (!cur) {
        await prisma.codingTestCase.create({
          data: { codingQuestionId: c.id, input: t.input, ...want },
        });
        tables.CodingTestCase.created += 1;
      } else if (cur.expectedOutput !== want.expectedOutput || cur.visibility !== want.visibility) {
        await prisma.codingTestCase.update({ where: { id: cur.id }, data: want });
        tables.CodingTestCase.updated += 1;
      } else {
        tables.CodingTestCase.unchanged += 1;
      }
    }

    {
      const rows = c.skills.map((n) => ({
        codingQuestionId: c.id,
        skillId: need(skillDbId.get(n), `skill ${n}`),
      }));
      const res = await prisma.codingQuestionSkill.createMany({ data: rows, skipDuplicates: true });
      joins.CodingQuestionSkill.created += res.count;
      joins.CodingQuestionSkill.alreadyLinked += rows.length - res.count;
    }
    if (c.jobTitleIds) {
      const rows = c.jobTitleIds.map((id) => ({
        codingQuestionId: c.id,
        jobTitleId: need(jobTitleId.get(id), `job title ${id}`),
      }));
      const res = await prisma.codingQuestionJobTitle.createMany({
        data: rows,
        skipDuplicates: true,
      });
      joins.CodingQuestionJobTitle.created += res.count;
      joins.CodingQuestionJobTitle.alreadyLinked += rows.length - res.count;
    }
  }

  // ------------------------------------------------------- protected tables
  const protectedAfter = await countProtected(prisma);
  const protectedCounts: ContentSeedReport["protectedCounts"] = {};
  for (const key of Object.keys(protectedBefore) as (keyof typeof protectedBefore)[]) {
    protectedCounts[key] = { before: protectedBefore[key], after: protectedAfter[key] };
    if (protectedBefore[key] !== protectedAfter[key]) {
      throw new Error(
        `FATAL: protected table ${key} changed during content seed ` +
          `(${protectedBefore[key]} -> ${protectedAfter[key]}). This must never happen.`,
      );
    }
  }

  return { tables, joins, protectedCounts };
}

function printReport(report: ContentSeedReport) {
  console.log("Additive content seed (no deletes, no assessment/user data touched):");
  for (const [name, t] of Object.entries(report.tables)) {
    const extra = t.leftAsIs ? `  left-as-is ${t.leftAsIs}` : "";
    console.log(
      `  ${name.padEnd(16)} created ${String(t.created).padStart(4)}  ` +
        `updated ${String(t.updated).padStart(4)}  unchanged ${String(t.unchanged).padStart(4)}` +
        extra,
    );
  }
  for (const [name, j] of Object.entries(report.joins)) {
    console.log(
      `  ${name.padEnd(24)} linked ${String(j.created).padStart(4)}  ` +
        `already-linked ${String(j.alreadyLinked).padStart(4)}`,
    );
  }
  for (const [name, c] of Object.entries(report.protectedCounts)) {
    console.log(`  protected ${name.padEnd(22)} ${c.before} -> ${c.after} (unchanged)`);
  }
  console.log("Done. Re-running this script is safe and should report 0 created / 0 updated.");
}

async function main() {
  const prisma = new PrismaClient();
  try {
    printReport(await runContentSeed(prisma));
  } finally {
    await prisma.$disconnect();
  }
}

// Only self-execute when run directly (tsx prisma/seed-content.ts); importing
// this module (e.g. from a test harness) must not open a database connection.
if (/(^|[\\/])seed-content\.[cm]?[jt]s$/.test(process.argv[1] ?? "")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
