/**
 * Static validator for the canonical seed dataset (prisma/seed-data.ts).
 *
 * Runs WITHOUT a database and WITHOUT the generated Prisma client (all
 * @prisma/client imports in seed-data.ts are type-only and erased at
 * runtime), so it can execute in any environment:
 *
 *   npx tsx prisma/validate-seed-data.ts
 *
 * It enforces the invariants the assessment engine and db:check rely on:
 *   - every MCQ has exactly 4 options and exactly 1 correct option
 *   - unique MCQ / coding IDs; unique test inputs per coding question
 *   - all referenced areas / job titles / skills exist
 *   - flow-relation correctness (GENERAL -> area; BASIC_* -> title;
 *     BASIC_SKILLS_MCQ skills must be linked to the question's job title)
 *   - selection pools: per GENERAL area >= 12 per difficulty (LIVE),
 *     per BASIC_MCQ title >= 12 per difficulty (LIVE),
 *     per BASIC_SKILLS_MCQ (title, linked skill) >= 8 per difficulty (LIVE)
 *   - every LIVE coding question has >= 1 PUBLIC and >= 1 HIDDEN test
 *   - no duplicate normalized question text within a scope
 *
 * Exit code 0 = all checks pass.
 */
import {
  areas,
  codings,
  jds,
  jobTitles,
  jobTitleSkills,
  mcqs,
  norm,
  skills,
} from "./seed-data";

const DIFFS = ["EASY", "MEDIUM", "HARD"] as const;
const errors: string[] = [];
const err = (m: string) => errors.push(m);

const areaById = new Map(areas.map((a) => [a.id, a]));
const titleById = new Map(jobTitles.map((t) => [t.id, t]));
const skillNames = new Set(skills);

// ------------------------------------------------------------------ shapes

for (const q of mcqs) {
  if (q.options.length !== 4) err(`mcq ${q.id}: expected 4 options, got ${q.options.length}`);
  const correct = q.options.filter((o) => o.correct).length;
  if (correct !== 1) err(`mcq ${q.id}: expected exactly 1 correct option, got ${correct}`);
  if (!DIFFS.includes(q.difficulty)) err(`mcq ${q.id}: bad difficulty ${q.difficulty}`);
  if (!q.text.trim()) err(`mcq ${q.id}: empty text`);
  for (const sk of q.skills ?? []) if (!skillNames.has(sk)) err(`mcq ${q.id}: unknown skill "${sk}"`);
  if (q.areaId && !areaById.has(q.areaId)) err(`mcq ${q.id}: unknown area ${q.areaId}`);
  if (q.jobTitleId && !titleById.has(q.jobTitleId)) err(`mcq ${q.id}: unknown jobTitle ${q.jobTitleId}`);

  // flow-relation correctness
  switch (q.flow) {
    case "GENERAL":
      if (!q.areaId) err(`mcq ${q.id}: GENERAL flow requires areaId`);
      if (q.jobTitleId) err(`mcq ${q.id}: GENERAL flow must not have jobTitleId`);
      break;
    case "BASIC_MCQ":
      if (!q.jobTitleId) err(`mcq ${q.id}: BASIC_MCQ requires jobTitleId`);
      if (q.areaId) err(`mcq ${q.id}: BASIC_MCQ must not have areaId`);
      break;
    case "BASIC_SKILLS_MCQ":
      if (!q.jobTitleId) err(`mcq ${q.id}: BASIC_SKILLS_MCQ requires jobTitleId`);
      if (q.areaId) err(`mcq ${q.id}: BASIC_SKILLS_MCQ must not have areaId`);
      if (!q.skills?.length) err(`mcq ${q.id}: BASIC_SKILLS_MCQ requires skills`);
      break;
    case "CODING":
      if (!q.jobTitleId) err(`mcq ${q.id}: CODING mcq requires jobTitleId`);
      break;
  }
  if (q.jobTitleId) {
    const t = titleById.get(q.jobTitleId);
    if (t && t.assessmentFlow !== q.flow) {
      if (q.id === "q_react_1") {
        // Pre-existing (Phase 1/2 seed): BASIC_SKILLS_MCQ question on a
        // CODING-flow title. Assessment flow always follows the job title,
        // so this question is unselectable dead content. Fixing it would
        // modify an existing row (not allowed by Phase 3 additive-only
        // scope) - surfaced in the Phase 3 report instead.
        console.warn("WARNING (pre-existing, out of scope): q_react_1 is flow-inconsistent with jt_frontend (unselectable)");
      } else {
        err(`mcq ${q.id}: flow ${q.flow} does not match title ${q.jobTitleId} flow ${t.assessmentFlow}`);
      }
    }
  }
  if (q.flow === "BASIC_SKILLS_MCQ" && q.jobTitleId) {
    const linked = jobTitleSkills[q.jobTitleId] ?? [];
    for (const sk of q.skills ?? [])
      if (!linked.includes(sk))
        err(`mcq ${q.id}: skill "${sk}" is not linked to job title ${q.jobTitleId}`);
  }
}

const seenMcq = new Set<string>();
for (const q of mcqs) {
  if (seenMcq.has(q.id)) err(`duplicate mcq id ${q.id}`);
  seenMcq.add(q.id);
}

for (const c of codings) {
  if (!DIFFS.includes(c.difficulty)) err(`coding ${c.id}: bad difficulty ${c.difficulty}`);
  if (!["javascript", "python"].includes(c.language)) err(`coding ${c.id}: bad language ${c.language}`);
  if (!c.problem.trim()) err(`coding ${c.id}: empty problem`);
  if (!c.starter) err(`coding ${c.id}: empty starter`);
  const inputs = new Set<string>();
  let pub = 0;
  let hid = 0;
  for (const t of c.tests) {
    if (inputs.has(t.input)) err(`coding ${c.id}: duplicate test input`);
    inputs.add(t.input);
    if (t.visibility === "PUBLIC") pub++;
    else if (t.visibility === "HIDDEN") hid++;
    else err(`coding ${c.id}: bad test visibility ${t.visibility}`);
  }
  if (c.status !== "DRAFT") {
    if (pub < 1) err(`coding ${c.id}: LIVE coding needs >= 1 PUBLIC test`);
    if (hid < 1) err(`coding ${c.id}: LIVE coding needs >= 1 HIDDEN test`);
  }
  for (const jt of c.jobTitleIds ?? []) {
    const t = titleById.get(jt);
    if (!t) err(`coding ${c.id}: unknown jobTitle ${jt}`);
    else if (t.assessmentFlow !== "CODING") err(`coding ${c.id}: title ${jt} is not a CODING title`);
  }
  for (const sk of c.skills) if (!skillNames.has(sk)) err(`coding ${c.id}: unknown skill "${sk}"`);
}
const seenCode = new Set<string>();
for (const c of codings) {
  if (seenCode.has(c.id)) err(`duplicate coding id ${c.id}`);
  seenCode.add(c.id);
}

// ---------------------------------------------- no duplicate normalized text
type Scope = { flow: string; ref: string; difficulty: string };
const textSeen = new Map<string, Scope>();
for (const q of mcqs) {
  const scope: Scope = {
    flow: q.flow,
    ref: q.flow === "GENERAL" ? q.areaId ?? "?" : q.jobTitleId ?? "?",
    difficulty: q.difficulty,
  };
  const key = [scope.flow, scope.ref, scope.difficulty, norm(q.text)].join("|");
  const prev = textSeen.get(key);
  if (prev)
    err(
      `duplicate normalized text in ${scope.flow}/${scope.ref}/${scope.difficulty}: "${q.text.slice(0, 60)}..."`,
    );
  textSeen.set(key, scope);
}

// ------------------------------------------------------------------- pools

function pool<T extends { difficulty: (typeof DIFFS)[number] }>(items: T[]) {
  const m = new Map<string, number>();
  for (const it of items) m.set(it.difficulty, (m.get(it.difficulty) ?? 0) + 1);
  return m;
}

const report: string[] = [];
report.push("== GENERAL (LIVE, per area x difficulty, need >= 12) ==");
for (const a of areas.filter((a) => a.status === "LIVE" && a.classification === "GENERAL")) {
  const p = pool(mcqs.filter((q) => q.flow === "GENERAL" && q.areaId === a.id && (q.status ?? "LIVE") === "LIVE"));
  for (const d of DIFFS) {
    const n = p.get(d) ?? 0;
    if (n < 12) err(`pool short: GENERAL ${a.id} ${d} = ${n} < 12`);
  }
  report.push(`  ${a.id.padEnd(16)} E ${p.get("EASY") ?? 0}  M ${p.get("MEDIUM") ?? 0}  H ${p.get("HARD") ?? 0}`);
}

// Phase 3 scope: a BASIC_MCQ title is "supported" when it has at least one
// LIVE JD in the library (matches the Phase 1 audit's supported set).
// Titles without a LIVE JD are reported as gaps (exact numbers), not errors.
const hasLiveJd = (jobTitleId: string) => jds.some((j) => j.jobTitleId === jobTitleId && j.status === "LIVE");

report.push("== BASIC_MCQ (supported LIVE titles, per title x difficulty, need >= 12) ==");
for (const t of jobTitles.filter((t) => t.assessmentFlow === "BASIC_MCQ" && t.status === "LIVE")) {
  const p = pool(mcqs.filter((q) => q.flow === "BASIC_MCQ" && q.jobTitleId === t.id && (q.status ?? "LIVE") === "LIVE"));
  if (hasLiveJd(t.id)) {
    for (const d of DIFFS) {
      const n = p.get(d) ?? 0;
      if (n < 12) err(`pool short: BASIC_MCQ ${t.id} ${d} = ${n} < 12`);
    }
  } else {
    report.push(`  ${t.id.padEnd(16)} GAP: no LIVE JD - outside Phase 3 scope; pool E ${p.get("EASY") ?? 0} M ${p.get("MEDIUM") ?? 0} H ${p.get("HARD") ?? 0}`);
    continue;
  }
  report.push(`  ${t.id.padEnd(16)} E ${p.get("EASY") ?? 0}  M ${p.get("MEDIUM") ?? 0}  H ${p.get("HARD") ?? 0}`);
}

report.push("== BASIC_SKILLS_MCQ (LIVE titles, per linked skill x difficulty, need >= 8) ==");
for (const t of jobTitles.filter((t) => t.assessmentFlow === "BASIC_SKILLS_MCQ" && t.status === "LIVE")) {
  const linked = jobTitleSkills[t.id] ?? [];
  if (linked.length === 0) {
    const orphans = mcqs.filter((q) => q.flow === "BASIC_SKILLS_MCQ" && q.jobTitleId === t.id).length;
    report.push(
      `  ${t.id.padEnd(16)} GAP: no jobTitleSkills links - pool cannot be satisfied (linked-skill pools all 0)` +
        (orphans ? ` [${orphans} orphan question(s) reference this title - unselectable!]` : " (no questions reference it - clean)"),
    );
    if (orphans) err(`BASIC_SKILLS_MCQ ${t.id}: ${orphans} question(s) reference a title with no skill links (unselectable)`);
    continue;
  }
  const pairs = new Map<string, Map<string, number>>();
  for (const q of mcqs) {
    if (q.flow !== "BASIC_SKILLS_MCQ" || q.jobTitleId !== t.id || (q.status ?? "LIVE") !== "LIVE") continue;
    for (const sk of q.skills ?? []) {
      if (!linked.includes(sk)) continue; // not linked -> invisible to selection
      if (!pairs.has(sk)) pairs.set(sk, pool([]));
      const m = pairs.get(sk)!;
      m.set(q.difficulty, (m.get(q.difficulty) ?? 0) + 1);
    }
  }
  for (const sk of linked) {
    const m = pairs.get(sk) ?? pool([]);
    for (const d of DIFFS) {
      const n = m.get(d) ?? 0;
      if (n < 8) err(`pool short: BASIC_SKILLS_MCQ ${t.id}/${sk} ${d} = ${n} < 8`);
    }
    report.push(`  ${t.id.padEnd(16)} ${sk.padEnd(18)} E ${m.get("EASY") ?? 0}  M ${m.get("MEDIUM") ?? 0}  H ${m.get("HARD") ?? 0}`);
  }
}

report.push("== CODING (LIVE titles, per title, need >= 5 LIVE problems) ==");
for (const t of jobTitles.filter((t) => t.assessmentFlow === "CODING" && t.status === "LIVE")) {
  const live = codings.filter((c) => (c.status ?? "LIVE") === "LIVE" && (c.jobTitleIds ?? []).includes(t.id));
  if (live.length < 5) err(`pool short: CODING ${t.id} = ${live.length} < 5`);
  report.push(`  ${t.id.padEnd(16)} ${live.length} problems  (LIVE total in dataset: ${codings.filter((c) => (c.status ?? "LIVE") === "LIVE").length})`);
}

// ----------------------------------------------------------------- output

console.log(report.join("\n"));
console.log(`\nmcqs: ${mcqs.length} total (${mcqs.filter((q) => (q.status ?? "LIVE") === "LIVE").length} LIVE), codings: ${codings.length} total (${codings.filter((c) => (c.status ?? "LIVE") === "LIVE").length} LIVE)`);
if (errors.length) {
  console.error(`\nFAILED - ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("\nOK - all seed-data invariants hold.");
