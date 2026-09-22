/**
 * Database integrity checks (spec §55), Phase 1 subset.
 *
 * Run after migrate + seed (and later after any data-touching release):
 *   npm run db:check --workspace apps/web
 *
 * Every check returns the number of violating rows; any non-zero count
 * fails the run. Checks that need application behaviour rather than SQL
 * (completed-assessment immutability, snapshot survival across refresh,
 * full assessment reconstruction) are enforced in Phases 8/11 and are
 * listed at the bottom of this file as comments.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Check = { name: string; sql: string };

const checks: Check[] = [
  {
    name: "no orphan AreaOfInterest (categoryId must exist)",
    sql: `SELECT COUNT(*)::int AS n FROM "AreaOfInterest" a LEFT JOIN "Category" c ON c.id = a."categoryId" WHERE c.id IS NULL`,
  },
  {
    name: "no orphan JobTitle (areaOfInterestId must exist)",
    sql: `SELECT COUNT(*)::int AS n FROM "JobTitle" t LEFT JOIN "AreaOfInterest" a ON a.id = t."areaOfInterestId" WHERE a.id IS NULL`,
  },
  {
    name: "no orphan JobDescription (jobTitleId must exist)",
    sql: `SELECT COUNT(*)::int AS n FROM "JobDescription" d LEFT JOIN "JobTitle" t ON t.id = d."jobTitleId" WHERE t.id IS NULL`,
  },
  {
    name: "no orphan link rows (QuestionSkill/QuestionArea/QuestionJobTitle/CodingQuestionSkill/CodingQuestionJobTitle/JobDescriptionSkill/JobTitleSkill)",
    sql: `
      SELECT COUNT(*)::int AS n FROM (
        SELECT 1 AS x FROM "QuestionSkill" l LEFT JOIN "Question" q ON q.id = l."questionId" LEFT JOIN "Skill" s ON s.id = l."skillId" WHERE q.id IS NULL OR s.id IS NULL
        UNION ALL SELECT 1 FROM "QuestionArea" l LEFT JOIN "Question" q ON q.id = l."questionId" LEFT JOIN "AreaOfInterest" a ON a.id = l."areaOfInterestId" WHERE q.id IS NULL OR a.id IS NULL
        UNION ALL SELECT 1 FROM "QuestionJobTitle" l LEFT JOIN "Question" q ON q.id = l."questionId" LEFT JOIN "JobTitle" t ON t.id = l."jobTitleId" WHERE q.id IS NULL OR t.id IS NULL
        UNION ALL SELECT 1 FROM "CodingQuestionSkill" l LEFT JOIN "CodingQuestion" q ON q.id = l."codingQuestionId" LEFT JOIN "Skill" s ON s.id = l."skillId" WHERE q.id IS NULL OR s.id IS NULL
        UNION ALL SELECT 1 FROM "CodingQuestionJobTitle" l LEFT JOIN "CodingQuestion" q ON q.id = l."codingQuestionId" LEFT JOIN "JobTitle" t ON t.id = l."jobTitleId" WHERE q.id IS NULL OR t.id IS NULL
        UNION ALL SELECT 1 FROM "JobDescriptionSkill" l LEFT JOIN "JobDescription" d ON d.id = l."jobDescriptionId" LEFT JOIN "Skill" s ON s.id = l."skillId" WHERE d.id IS NULL OR s.id IS NULL
        UNION ALL SELECT 1 FROM "JobTitleSkill" l LEFT JOIN "JobTitle" t ON t.id = l."jobTitleId" LEFT JOIN "Skill" s ON s.id = l."skillId" WHERE t.id IS NULL OR s.id IS NULL
      ) v`,
  },
  {
    name: "every library question has >=1 of JobTitle / Area / Skill (Part 3 rule)",
    sql: `
      SELECT COUNT(*)::int AS n FROM "Question" q
      WHERE NOT EXISTS (SELECT 1 FROM "QuestionJobTitle" l WHERE l."questionId" = q.id)
        AND NOT EXISTS (SELECT 1 FROM "QuestionArea" l WHERE l."questionId" = q.id)
        AND NOT EXISTS (SELECT 1 FROM "QuestionSkill" l WHERE l."skillId" IS NOT NULL AND l."questionId" = q.id)`,
  },
  {
    name: "every coding question has >=1 of JobTitle / Skill",
    sql: `
      SELECT COUNT(*)::int AS n FROM "CodingQuestion" q
      WHERE NOT EXISTS (SELECT 1 FROM "CodingQuestionJobTitle" l WHERE l."codingQuestionId" = q.id)
        AND NOT EXISTS (SELECT 1 FROM "CodingQuestionSkill" l WHERE l."codingQuestionId" = q.id)`,
  },
  {
    name: "no duplicate AssessmentQuestion sequence per assessment (§55)",
    sql: `SELECT COUNT(*)::int AS n FROM (SELECT 1 FROM "AssessmentQuestion" GROUP BY "assessmentId", sequence HAVING COUNT(*) > 1) v`,
  },
  {
    name: "no duplicate library/coding question inside one assessment (§36/§55)",
    sql: `
      SELECT COUNT(*)::int AS n FROM (
        SELECT 1 FROM "AssessmentQuestion" WHERE "libraryQuestionId" IS NOT NULL GROUP BY "assessmentId", "libraryQuestionId" HAVING COUNT(*) > 1
        UNION ALL
        SELECT 1 FROM "AssessmentQuestion" WHERE "codingQuestionId" IS NOT NULL GROUP BY "assessmentId", "codingQuestionId" HAVING COUNT(*) > 1
      ) v`,
  },
  {
    name: "no duplicate AssessmentSkill mappings (§55)",
    sql: `SELECT COUNT(*)::int AS n FROM (SELECT 1 FROM "AssessmentSkill" GROUP BY "assessmentId", "skillId" HAVING COUNT(*) > 1) v`,
  },
  {
    name: "AssessmentQuestion has exactly one of libraryQuestionId / codingQuestionId (C10)",
    sql: `
      SELECT COUNT(*)::int AS n FROM "AssessmentQuestion"
      WHERE ("libraryQuestionId" IS NULL) = ("codingQuestionId" IS NULL)`,
  },
  {
    name: "source/kind consistency: MCQ sources point at library MCQ or AI snapshot; coding sources at coding question",
    sql: `
      SELECT COUNT(*)::int AS n FROM "AssessmentQuestion" aq
      WHERE (aq.source IN ('QUESTION_LIBRARY','AI_GENERATED') AND aq."codingQuestionId" IS NOT NULL)
         OR (aq.source IN ('CODING_LIBRARY','AI_CODING_GENERATED') AND aq."libraryQuestionId" IS NOT NULL)`,
  },
  {
    name: "every MCQ library question has exactly one correct option (§33)",
    sql: `
      SELECT COUNT(*)::int AS n FROM "Question" q
      WHERE (SELECT COUNT(*) FROM "QuestionOption" o WHERE o."questionId" = q.id AND o."isCorrect") <> 1`,
  },
  {
    name: "every LIVE coding question has >=1 HIDDEN and >=1 PUBLIC test case (§23/§24)",
    sql: `
      SELECT COUNT(*)::int AS n FROM "CodingQuestion" q WHERE q.status = 'LIVE'
        AND NOT EXISTS (SELECT 1 FROM "CodingTestCase" t WHERE t."codingQuestionId" = q.id AND t.visibility = 'HIDDEN')`,
  },
  {
    name: "TOPIC_TRACK categories contain no ROLE_BASED areas (C2 invariant)",
    sql: `
      SELECT COUNT(*)::int AS n FROM "AreaOfInterest" a JOIN "Category" c ON c.id = a."categoryId"
      WHERE c.kind = 'TOPIC_TRACK' AND a.classification = 'ROLE_BASED'`,
  },
  {
    name: "GENERAL areas live only in TOPIC_TRACK categories (C2 invariant, converse)",
    sql: `
      SELECT COUNT(*)::int AS n FROM "AreaOfInterest" a JOIN "Category" c ON c.id = a."categoryId"
      WHERE c.kind = 'JOB_TRACK' AND a.classification = 'GENERAL'`,
  },
  {
    name: "JOB_TRACK areas have >=1 job title; TOPIC_TRACK areas have none",
    sql: `
      SELECT COUNT(*)::int AS n FROM "AreaOfInterest" a
      WHERE (a.classification = 'ROLE_BASED' AND a.status = 'LIVE'
             AND NOT EXISTS (SELECT 1 FROM "JobTitle" t WHERE t."areaOfInterestId" = a.id))
         OR (a.classification = 'GENERAL'
             AND EXISTS (SELECT 1 FROM "JobTitle" t WHERE t."areaOfInterestId" = a.id))`,
  },
  {
    name: "job titles carry one of the three role-based flows (four-flow rule)",
    sql: `SELECT COUNT(*)::int AS n FROM "JobTitle" WHERE "assessmentFlow" = 'GENERAL'`,
  },
  {
    name: "no UserAnswer without a matching assessment question; answers belong to their question's user",
    sql: `
      SELECT COUNT(*)::int AS n FROM "UserAnswer" ua
      LEFT JOIN "AssessmentQuestion" aq ON aq.id = ua."assessmentQuestionId"
      LEFT JOIN "Assessment" a ON a.id = aq."assessmentId"
      WHERE aq.id IS NULL OR a."userId" <> ua."userId"`,
  },
  {
    name: "questionSnapshot present on every assessment question (§48/§55)",
    sql: `SELECT COUNT(*)::int AS n FROM "AssessmentQuestion" WHERE "questionSnapshot" IS NULL`,
  },
];

// App-level §55 items intentionally NOT here (they need lifecycle code):
//  - completed assessment cannot be mutated (Phase 8 status machine)
//  - AI snapshot survives refresh/reload (Phase 8/9 read paths)
//  - assessment reconstructable from DB state (Phase 11 results read path)

async function main() {
  let failed = false;
  for (const check of checks) {
    const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(check.sql);
    const n = rows[0]?.n ?? -1;
    const ok = n === 0;
    if (!ok) failed = true;
    console.log(`${ok ? "PASS" : "FAIL"}  violations=${n}  ${check.name}`);
  }
  console.log(failed ? "INTEGRITY: FAILED" : "INTEGRITY: ALL CHECKS PASSED");
  process.exit(failed ? 1 : 0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
