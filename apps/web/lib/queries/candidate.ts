import { isCodingSnapshot, parseCodingSnapshot } from "@/lib/assessment/snapshot";
import { getPrisma } from "@/lib/prisma";

/**
 * Candidate-facing reads (Phase 3).
 *
 * Rules honoured here:
 * - EVERY query is scoped by the session-derived userId passed in from
 *   requireUser(); no id ever comes from query params or client state.
 * - Only display-safe fields are selected. questionSnapshot and other
 *   server-only payloads are never selected, so they cannot leak to clients.
 * - Aggregations run over the user's own rows only (prototype scale; the
 *   indexes from Phase 1 keep these cheap as data grows).
 */

const prisma = () => getPrisma();

/**
 * Boundary types for Prisma results. The ungenerated client stub types
 * queries as any; these explicit select shapes keep this module strictly
 * typed in every environment and double as documentation of exactly which
 * columns each read touches (display-safe fields only).
 */
type SkillRef = { id: string; name: string };
type CompletedSelect = {
  id: string;
  finalPercentage: number | null;
  completedAt: Date | null;
  flow: string;
  areaOfInterest: { name: string };
  category: { name: string };
};
type OpenSelect = {
  id: string;
  difficulty: string;
  experienceBand: string | null;
  areaOfInterest: { name: string };
  category: { name: string };
} | null;
type AnswerSelect = {
  isCorrect: boolean;
  submittedAt: Date;
  assessmentQuestion: { skillId: string | null };
};
type AnswerNoDate = Omit<AnswerSelect, "submittedAt">;

const COMPLETED = "COMPLETED" as const;
const OPEN_STATUSES = ["CONFIGURING", "GENERATED", "PREVIEW", "IN_PROGRESS"] as const;

export type CompletedRow = {
  id: string;
  label: string;
  sublabel: string;
  finalPercentage: number | null;
  completedAt: Date | null;
  flow: string;
};

export type DashboardData = {
  taken: number;
  averagePercentage: number | null;
  skillsAssessed: number;
  continueCard: {
    id: string;
    label: string;
    answered: number;
    total: number;
    difficulty: string;
    experienceBand: string | null;
    estimatedMinutes: number;
  } | null;
  recent: CompletedRow[];
  skillPerformance: { skillId: string; name: string; pct: number; answered: number }[];
  progressComparison: {
    name: string;
    monthPct: number | null;
    allPct: number;
  }[];
  topImprovement: { name: string; delta: number } | null;
};

function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const db = prisma();
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [completed, openAssessment, answers, skillRows] = await Promise.all([
    db.assessment.findMany({
      where: { userId, status: COMPLETED },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        finalPercentage: true,
        completedAt: true,
        flow: true,
        areaOfInterest: { select: { name: true } },
        category: { select: { name: true } },
      },
    }) as Promise<CompletedSelect[]>,
    db.assessment.findFirst({
      where: { userId, status: { in: [...OPEN_STATUSES] } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        difficulty: true,
        experienceBand: true,
        areaOfInterest: { select: { name: true } },
        category: { select: { name: true } },
      },
    }) as Promise<OpenSelect>,
    db.userAnswer.findMany({
      where: { userId, assessmentQuestion: { assessment: { status: COMPLETED } } },
      select: {
        isCorrect: true,
        submittedAt: true,
        assessmentQuestion: { select: { skillId: true } },
      },
    }) as Promise<AnswerSelect[]>,
    db.assessmentQuestion.findMany({
      where: { assessment: { userId, status: COMPLETED } },
      select: { skillId: true },
      distinct: ["skillId"],
    }) as Promise<{ skillId: string | null }[]>,
  ]);

  let continueCard: DashboardData["continueCard"] = null;
  if (openAssessment) {
    const [total, answered] = await Promise.all([
      db.assessmentQuestion.count({ where: { assessmentId: openAssessment.id } }),
      db.userAnswer.count({
        where: { userId, assessmentQuestion: { assessmentId: openAssessment.id } },
      }),
    ]);
    const remaining = Math.max(0, total - answered);
    continueCard = {
      id: openAssessment.id,
      label: openAssessment.areaOfInterest.name,
      answered,
      total,
      difficulty: openAssessment.difficulty,
      experienceBand: openAssessment.experienceBand,
      // UI estimate only (30s/question), never stored or trusted elsewhere.
      estimatedMinutes: Math.max(1, Math.ceil((remaining * 30) / 60)),
    };
  }

  // Per-skill correctness, all time vs this month.
  type Acc = { total: number; correct: number; monthTotal: number; monthCorrect: number };
  const bySkill = new Map<string, Acc>();
  for (const a of answers) {
    // Only real skill attributions count as skills; GENERAL questions carry
    // skillId null by decision A4 and must not fabricate a pseudo-skill.
    const key = a.assessmentQuestion.skillId;
    if (!key) continue;
    const acc = bySkill.get(key) ?? { total: 0, correct: 0, monthTotal: 0, monthCorrect: 0 };
    acc.total += 1;
    if (a.isCorrect) acc.correct += 1;
    if (a.submittedAt >= monthStart) {
      acc.monthTotal += 1;
      if (a.isCorrect) acc.monthCorrect += 1;
    }
    bySkill.set(key, acc);
  }

  const skillIds = [...bySkill.keys()].filter((k) => k !== "general");
  const names = new Map<string, string>(
    ((await db.skill.findMany({
      where: { id: { in: skillIds } },
      select: { id: true, name: true },
    })) as SkillRef[]).map((s) => [s.id, s.name] as const),
  );
  const labelFor = (key: string) => names.get(key) ?? "Skill";

  const progressComparison = [...bySkill.entries()]
    .map(([key, acc]) => ({
      name: labelFor(key),
      monthPct: acc.monthTotal ? (acc.monthCorrect / acc.monthTotal) * 100 : null,
      allPct: acc.total ? (acc.correct / acc.total) * 100 : 0,
      total: acc.total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)
    .map(({ name, monthPct, allPct }) => ({ name, monthPct, allPct }));

  let topImprovement: DashboardData["topImprovement"] = null;
  for (const [key, acc] of bySkill.entries()) {
    if (!acc.monthTotal) continue;
    const delta = (acc.monthCorrect / acc.monthTotal) * 100 - (acc.correct / acc.total) * 100;
    if (!topImprovement || delta > topImprovement.delta) {
      topImprovement = { name: labelFor(key), delta };
    }
  }
  if (topImprovement && topImprovement.delta <= 0) topImprovement = null;

  const scored = completed.filter((c) => c.finalPercentage !== null);
  return {
    taken: completed.length,
    averagePercentage: scored.length
      ? scored.reduce((s, c) => s + (c.finalPercentage ?? 0), 0) / scored.length
      : null,
    skillsAssessed: skillRows.filter((r) => r.skillId !== null).length,
    continueCard,
    recent: completed.slice(0, 5).map((c) => ({
      id: c.id,
      label: c.areaOfInterest.name,
      sublabel: c.category.name,
      finalPercentage: c.finalPercentage,
      completedAt: c.completedAt,
      flow: c.flow,
    })),
    skillPerformance: [...bySkill.entries()]
      .map(([key, acc]) => ({
        skillId: key,
        name: labelFor(key),
        pct: acc.total ? (acc.correct / acc.total) * 100 : 0,
        answered: acc.total,
      }))
      .sort((a, b) => b.answered - a.answered)
      .slice(0, 5),
    progressComparison,
    topImprovement,
  };
}

export type LandingSection = {
  categoryId: string;
  title: string;
  categorySlug: string;
  areas: {
    id: string;
    name: string;
    meta: string;
    classification: string;
    flows: string[];
  }[];
};

/** New Assessment landing: one carousel section per LIVE category. */
export async function getLandingSections(): Promise<LandingSection[]> {
  type LandingCategory = {
    id: string;
    name: string;
    slug: string;
    areas: {
      id: string;
      name: string;
      classification: string;
      jobTitles: { id: string; assessmentFlow: string }[];
    }[];
  };
  const categories = (await prisma().category.findMany({
    where: { status: "LIVE", areas: { some: { status: "LIVE" } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      areas: {
        where: { status: "LIVE" },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          classification: true,
          jobTitles: {
            where: { status: "LIVE" },
            select: { id: true, assessmentFlow: true },
          },
        },
      },
    },
  })) as LandingCategory[];

  return categories
    .sort((a, b) => (a.slug === "general" ? -1 : b.slug === "general" ? 1 : 0))
    .map((c) => ({
      categoryId: c.id,
      title: `${c.name} Assessments`,
      categorySlug: c.slug,
      areas: c.areas.map((a) => ({
        id: a.id,
        name: a.name,
        meta:
          a.classification === "ROLE_BASED"
            ? `${a.jobTitles.length} role${a.jobTitles.length === 1 ? "" : "s"}`
            : "General assessment",
        classification: a.classification,
        flows: [...new Set(a.jobTitles.map((t) => t.assessmentFlow))],
      })),
    }));
}

export type ResultsFilter = "all" | "general" | "personalised";

export async function getResultsHistory(
  userId: string,
  filter: ResultsFilter,
): Promise<CompletedRow[]> {
  const flowWhere =
    filter === "general"
      ? { flow: "GENERAL" as const }
      : filter === "personalised"
        ? { flow: { in: ["BASIC_MCQ", "BASIC_SKILLS_MCQ", "CODING"] as const } }
        : {};

  const rows = (await prisma().assessment.findMany({
    where: { userId, status: COMPLETED, ...flowWhere },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      finalPercentage: true,
      completedAt: true,
      flow: true,
      areaOfInterest: { select: { name: true } },
      category: { select: { name: true } },
    },
  })) as CompletedSelect[];
  return rows.map((r) => ({
    id: r.id,
    label: r.areaOfInterest.name,
    sublabel: r.category.name,
    finalPercentage: r.finalPercentage,
    completedAt: r.completedAt,
    flow: r.flow,
  }));
}

export async function getSkillProgress(
  userId: string,
): Promise<{ name: string; pct: number; answered: number }[]> {
  const answers = (await prisma().userAnswer.findMany({
    where: { userId, assessmentQuestion: { assessment: { status: COMPLETED } } },
    select: { isCorrect: true, assessmentQuestion: { select: { skillId: true } } },
  })) as AnswerNoDate[];
  const bySkill = new Map<string, { total: number; correct: number }>();
  for (const a of answers) {
    const key = a.assessmentQuestion.skillId;
    if (!key) continue;
    const acc = bySkill.get(key) ?? { total: 0, correct: 0 };
    acc.total += 1;
    if (a.isCorrect) acc.correct += 1;
    bySkill.set(key, acc);
  }
  const names = new Map<string, string>(
    ((await prisma().skill.findMany({
      where: { id: { in: [...bySkill.keys()].filter((k) => k !== "general") } },
      select: { id: true, name: true },
    })) as SkillRef[]).map((s) => [s.id, s.name] as const),
  );
  return [...bySkill.entries()]
    .map(([key, acc]) => ({
      name: names.get(key) ?? "Skill",
      pct: acc.total ? (acc.correct / acc.total) * 100 : 0,
      answered: acc.total,
    }))
    .sort((a, b) => b.answered - a.answered);
}

export type AssessmentResult = {
  id: string;
  areaName: string;
  categoryName: string;
  jobTitleName: string | null;
  flow: string;
  status: string;
  /** Phase 8: small "Adaptive" mode indicator on the result (Part O). */
  adaptiveEnabled: boolean;
  difficulty: string;
  experienceBand: string | null;
  finalPercentage: number | null;
  completedAt: Date | null;
  createdAt: Date;
  requestedQuestionCount: number;
  skills: string[];
  perSkill: { name: string; correct: number; total: number }[];
  correct: number;
  total: number;
  /** CODING only: per-challenge execution summary (safe fields; hidden test
   *  contents are never included — aggregate counts only). */
  codingQuestions: {
    sequence: number;
    title: string;
    isCorrect: boolean;
    passedTestCount: number | null;
    totalTestCount: number | null;
  }[];
};

/**
 * Single-result read for /results/[id]. Ownership is enforced in the WHERE
 * clause (id AND userId): another user's id simply yields null.
 * questionSnapshot is deliberately NOT selected.
 */
export async function getAssessmentResult(
  userId: string,
  assessmentId: string,
): Promise<AssessmentResult | null> {
  const db = prisma();
  type ResultSelect = {
    id: string;
    flow: string;
    status: string;
    adaptiveEnabled: boolean;
    difficulty: string;
    experienceBand: string | null;
    finalPercentage: number | null;
    completedAt: Date | null;
    createdAt: Date;
    requestedQuestionCount: number;
    areaOfInterest: { name: string };
    category: { name: string };
    jobTitle: { name: string } | null;
    skills: { skill: { name: string } }[];
  };
  const assessment = (await db.assessment.findFirst({
    where: { id: assessmentId, userId },
    select: {
      id: true,
      flow: true,
      status: true,
      adaptiveEnabled: true,
      difficulty: true,
      experienceBand: true,
      finalPercentage: true,
      completedAt: true,
      createdAt: true,
      requestedQuestionCount: true,
      areaOfInterest: { select: { name: true } },
      category: { select: { name: true } },
      jobTitle: { select: { name: true } },
      skills: { select: { skill: { select: { name: true } } } },
    },
  })) as ResultSelect | null;
  if (!assessment) return null;

  const answers = (await db.userAnswer.findMany({
    where: { userId, assessmentQuestion: { assessmentId } },
    select: { isCorrect: true, assessmentQuestion: { select: { skillId: true } } },
  })) as AnswerNoDate[];
  const bySkill = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const key = a.assessmentQuestion.skillId;
    if (!key) continue;
    const acc = bySkill.get(key) ?? { correct: 0, total: 0 };
    acc.total += 1;
    if (a.isCorrect) acc.correct += 1;
    bySkill.set(key, acc);
  }
  const names = new Map<string, string>(
    ((await db.skill.findMany({
      where: { id: { in: [...bySkill.keys()].filter((k) => k !== "general") } },
      select: { id: true, name: true },
    })) as SkillRef[]).map((s) => [s.id, s.name] as const),
  );

  let codingQuestions: AssessmentResult["codingQuestions"] = [];
  if (assessment.flow === "CODING" && assessment.status === "COMPLETED") {
    const rows = (await db.userAnswer.findMany({
      where: { userId, assessmentQuestion: { assessmentId } },
      select: {
        isCorrect: true,
        passedTestCount: true,
        totalTestCount: true,
        assessmentQuestion: { select: { sequence: true, questionSnapshot: true } },
      },
      orderBy: { assessmentQuestion: { sequence: "asc" } },
    })) as {
      isCorrect: boolean;
      passedTestCount: number | null;
      totalTestCount: number | null;
      assessmentQuestion: { sequence: number; questionSnapshot: unknown };
    }[];
    codingQuestions = rows.map((r) => ({
      sequence: r.assessmentQuestion.sequence,
      title: isCodingSnapshot(r.assessmentQuestion.questionSnapshot)
        ? parseCodingSnapshot(r.assessmentQuestion.questionSnapshot).title
        : "Coding challenge",
      isCorrect: r.isCorrect,
      passedTestCount: r.passedTestCount,
      totalTestCount: r.totalTestCount,
    }));
  }

  return {
    id: assessment.id,
    areaName: assessment.areaOfInterest.name,
    categoryName: assessment.category.name,
    jobTitleName: assessment.jobTitle?.name ?? null,
    flow: assessment.flow,
    status: assessment.status,
    adaptiveEnabled: assessment.adaptiveEnabled,
    difficulty: assessment.difficulty,
    experienceBand: assessment.experienceBand,
    finalPercentage: assessment.finalPercentage,
    completedAt: assessment.completedAt,
    createdAt: assessment.createdAt,
    requestedQuestionCount: assessment.requestedQuestionCount,
    skills: assessment.skills.map((s) => s.skill.name),
    perSkill: [...bySkill.entries()].map(([key, v]) => ({
      name: names.get(key) ?? "Skill",
      correct: v.correct,
      total: v.total,
    })),
    correct: answers.filter((a) => a.isCorrect).length,
    total: answers.length,
    codingQuestions,
  };
}
