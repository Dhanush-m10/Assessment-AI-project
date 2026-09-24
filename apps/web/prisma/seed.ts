/**
 * Development seed (Phase 1).
 *
 * Scale and names follow the prototype evidence recorded in
 * docs/DECISIONS.md ("Facts extracted from the PDF screenshots"):
 * 7 categories (6 JOB_TRACK from the admin mockups + the TOPIC_TRACK
 * "General" category seen on the candidate dashboard), 24 areas, 12 job
 * titles with the mockup's flow assignments, 24 JDs across the three
 * approved experience bands, ~22 skills, 36 MCQ + 6 coding questions with
 * public and hidden test cases, plus representative DRAFT content.
 *
 * Idempotency: the seed refuses to run on a non-empty database. It is a dev
 * dataset loader, not a migration. Wipe and re-run to reset.
 *
 * Run order: npm run prisma:generate && npx prisma migrate dev && npm run db:seed
 *
 * The dataset itself lives in prisma/seed-data.ts, shared verbatim with the
 * additive content seeder (prisma/seed-content.ts). This file's behavior is
 * unchanged: it still refuses to run on a non-empty database.
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

const prisma = new PrismaClient();

// ------------------------------------------------------------------- run

async function main() {
  const existing = await prisma.category.count();
  if (existing > 0) {
    console.log("Seed skipped: database already contains data. Wipe to re-seed.");
    return;
  }

  for (const c of categories) {
    await prisma.category.create({ data: { id: c.id, name: c.name, slug: slug(c.name), kind: c.kind, status: c.status } });
  }
  for (const a of areas) {
    await prisma.areaOfInterest.create({ data: { id: a.id, categoryId: a.categoryId, name: a.name, slug: slug(a.name), classification: a.classification, status: a.status } });
  }
  for (const t of jobTitles) {
    await prisma.jobTitle.create({ data: { id: t.id, areaOfInterestId: t.areaOfInterestId, name: t.name, slug: slug(t.name), assessmentFlow: t.assessmentFlow, status: t.status } });
  }
  for (const s of skills) {
    await prisma.skill.create({ data: { id: skillId(s), name: s, normalizedName: norm(s), slug: slug(s) } });
  }
  for (const [jtId, names] of Object.entries(jobTitleSkills)) {
    for (const s of names) {
      await prisma.jobTitleSkill.create({ data: { jobTitleId: jtId, skillId: skillId(s) } });
    }
  }
  for (const jd of jds) {
    await prisma.jobDescription.create({
      data: {
        id: jd.id,
        jobTitleId: jd.jobTitleId,
        title: `${jobTitles.find((t) => t.id === jd.jobTitleId)!.name} – ${bandLabel[jd.band]}`,
        content: jd.content,
        experienceBand: jd.band,
        source: jd.source,
        status: jd.status,
        skills: { create: jd.skills.map((s) => ({ skillId: skillId(s) })) },
      },
    });
  }
  for (const q of mcqs) {
    await prisma.question.create({
      data: {
        id: q.id,
        questionText: q.text,
        difficulty: q.difficulty,
        assessmentFlow: q.flow,
        status: q.status ?? "LIVE",
        options: { create: q.options.map((o, i) => ({ position: i, text: o.text, isCorrect: !!o.correct })) },
        skills: q.skills ? { create: q.skills.map((s) => ({ skillId: skillId(s) })) } : undefined,
        areas: q.areaId ? { create: [{ areaOfInterestId: q.areaId }] } : undefined,
        jobTitles: q.jobTitleId ? { create: [{ jobTitleId: q.jobTitleId }] } : undefined,
      },
    });
  }
  for (const c of codings) {
    await prisma.codingQuestion.create({
      data: {
        id: c.id,
        title: c.title,
        problemStatement: c.problem,
        difficulty: c.difficulty,
        language: c.language,
        starterCode: c.starter,
        status: c.status ?? "LIVE",
        testCases: { create: c.tests.map((t) => ({ input: t.input, expectedOutput: t.expected, visibility: t.visibility })) },
        skills: { create: c.skills.map((s) => ({ skillId: skillId(s) })) },
        jobTitles: c.jobTitleIds ? { create: c.jobTitleIds.map((id) => ({ jobTitleId: id })) } : undefined,
      },
    });
  }

  const counts = {
    categories: await prisma.category.count(),
    areas: await prisma.areaOfInterest.count(),
    jobTitles: await prisma.jobTitle.count(),
    jobDescriptions: await prisma.jobDescription.count(),
    skills: await prisma.skill.count(),
    questions: await prisma.question.count(),
    codingQuestions: await prisma.codingQuestion.count(),
    testCases: await prisma.codingTestCase.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
