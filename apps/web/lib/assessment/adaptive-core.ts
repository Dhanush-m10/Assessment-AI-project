/**
 * Adaptive Assessment V1 — PURE deterministic core (Phase 8).
 *
 * No Prisma, no I/O: every rule here is a pure function of stored facts so it
 * is testable offline and reproducible on every refresh/resume (Part M). The
 * server glue (lib/assessment/adaptive.ts) loads state from the database,
 * calls these functions and persists the outcome.
 *
 * V1 rules (deliberately simple, rule-based, explainable — no ML/IRT):
 * - Blueprint (Part F): per-skill targets are the D-DIST even split of the
 *   requested count across the ordered final skill set (remainder to earlier
 *   tiers). Each target is split into bounded difficulty bands around the
 *   START difficulty: center = max(1, floor(q/2)), lower = ceil(rest/2),
 *   upper = rest - lower. Bands map onto EASY/MEDIUM/HARD via clamped ±1
 *   steps from the start (starting at an edge merges the outer band into the
 *   edge). Σ caps = Σ targets = requested count — the count stays
 *   authoritative and no distribution is invented at runtime.
 * - Difficulty walk (Parts G/H): per skill, current difficulty starts at the
 *   user-selected difficulty and moves +1 per correct / -1 per incorrect
 *   answer, clamped to EASY..HARD. Single steps only — EASY can never jump
 *   to HARD or vice versa, and no single answer can flip the whole
 *   assessment.
 * - Skill need (Part I): skills are served in deterministic "diagnostic
 *   need" order — unseen skills first (tier order: guarantees minimum
 *   coverage), then lowest correct-rate (exact fraction compare), ties by
 *   largest remaining target, then tier order. Skills that reached their
 *   target are excluded (maximum coverage); the assessment can never be
 *   consumed by one skill.
 * - Fallbacks (Part J): within a skill, difficulty trials run
 *   [current, current-1, current+1, current-2, current+2] (clamped, deduped,
 *   only bands with remaining cap) — i.e. HARD unavailable → MEDIUM; then
 *   the next skill in need order; if nothing is eligible anywhere the
 *   caller returns the controlled insufficient-pool state (never fabricates).
 */

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export const DIFFICULTY_ORDER: readonly Difficulty[] = ["EASY", "MEDIUM", "HARD"];

/** Pseudo-skill key for difficulty-only adaptive (no skills configured). */
export const NO_SKILL = "";

function difficultyIndex(d: Difficulty): number {
  return DIFFICULTY_ORDER.indexOf(d);
}

/** One controlled step, clamped to EASY..HARD (Part H: never a double jump). */
export function stepDifficulty(d: Difficulty, delta: number): Difficulty {
  const clamped = Math.max(-1, Math.min(1, delta));
  const idx = Math.max(0, Math.min(DIFFICULTY_ORDER.length - 1, difficultyIndex(d) + clamped));
  return DIFFICULTY_ORDER[idx];
}

export type Blueprint = {
  /** skillId -> question budget (NO_SKILL for difficulty-only mode). */
  targets: Record<string, number>;
  /** skillId -> per-difficulty serve caps; Σ caps[skill] = targets[skill]. */
  caps: Record<string, Record<Difficulty, number>>;
};

/** Deterministic blueprint from the requested count + ordered skill set. */
export function buildBlueprint(
  count: number,
  orderedSkillIds: string[],
  start: Difficulty,
): Blueprint {
  const skills = orderedSkillIds.length > 0 ? orderedSkillIds : [NO_SKILL];
  const targets: Record<string, number> = {};
  const caps: Record<string, Record<Difficulty, number>> = {};

  const base = Math.floor(count / skills.length);
  const remainder = count % skills.length;
  skills.forEach((skillId, i) => {
    targets[skillId] = base + (i < remainder ? 1 : 0);
  });

  for (const skillId of skills) {
    const q = targets[skillId];
    const center = Math.max(q > 0 ? 1 : 0, Math.floor(q / 2));
    const rest = q - center;
    const lower = Math.ceil(rest / 2);
    const upper = rest - lower;
    const bands: Record<Difficulty, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
    bands[start] += center;
    bands[stepDifficulty(start, -1)] += lower; // clamped: merges at edges
    bands[stepDifficulty(start, +1)] += upper;
    caps[skillId] = bands;
  }

  return { targets, caps };
}

export type ServedRow = {
  sequence: number;
  /** null for difficulty-only mode. */
  skillId: string | null;
  /** Frozen in the snapshot at serve time. */
  difficulty: Difficulty;
  answered: boolean;
  isCorrect: boolean | null;
};

export type SkillState = {
  served: number;
  seen: number;
  correct: number;
  incorrect: number;
  current: Difficulty;
  bandUsed: Record<Difficulty, number>;
};

export type AdaptiveState = {
  count: number;
  start: Difficulty;
  servedCount: number;
  answeredCount: number;
  skills: Record<string, SkillState>;
};

function emptySkillState(start: Difficulty): SkillState {
  return {
    served: 0,
    seen: 0,
    correct: 0,
    incorrect: 0,
    current: start,
    bandUsed: { EASY: 0, MEDIUM: 0, HARD: 0 },
  };
}

/**
 * Reconstruct the authoritative adaptive state by replaying served rows in
 * sequence order (Part M: the database is the state; refresh/resume/retry all
 * recompute the identical result).
 */
export function replayState(
  rows: ServedRow[],
  count: number,
  start: Difficulty,
): AdaptiveState {
  const state: AdaptiveState = {
    count,
    start,
    servedCount: rows.length,
    answeredCount: 0,
    skills: {},
  };
  const ordered = rows.slice().sort((a, b) => a.sequence - b.sequence);
  for (const row of ordered) {
    const key = row.skillId ?? NO_SKILL;
    const st = (state.skills[key] ??= emptySkillState(start));
    st.served += 1;
    st.bandUsed[row.difficulty] = (st.bandUsed[row.difficulty] ?? 0) + 1;
    if (row.answered) {
      state.answeredCount += 1;
      st.seen += 1;
      if (row.isCorrect === true) {
        st.correct += 1;
        st.current = stepDifficulty(st.current, +1);
      } else if (row.isCorrect === false) {
        st.incorrect += 1;
        st.current = stepDifficulty(st.current, -1);
      }
    }
  }
  return state;
}

/**
 * Deterministic skill order for the next question (Part I):
 * 1. skills with remaining target, unseen first (tier order) — minimum
 *    coverage guarantee;
 * 2. then lowest correct-rate (exact cross-multiplied fraction compare — no
 *    float ties) so weaker skills receive diagnostic attention;
 * 3. ties: largest remaining target, then tier order, then skillId.
 * Skills at/over target are excluded — maximum coverage.
 */
export function skillNeedOrder(
  state: AdaptiveState,
  blueprint: Blueprint,
  orderedSkillIds: string[],
): string[] {
  const tierOf = (key: string): number => {
    const i = orderedSkillIds.indexOf(key);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const candidates = Object.keys(blueprint.targets).filter(
    (key) => (state.skills[key]?.served ?? 0) < blueprint.targets[key],
  );
  return candidates.sort((a, b) => {
    const sa = state.skills[a] ?? emptySkillState(state.start);
    const sb = state.skills[b] ?? emptySkillState(state.start);
    // Unseen skills first (tier order among them).
    if ((sa.seen === 0) !== (sb.seen === 0)) return sa.seen === 0 ? -1 : 1;
    if (sa.seen === 0 && sb.seen === 0) return tierOf(a) - tierOf(b) || a.localeCompare(b);
    // Lowest correct-rate first: correct/seen compared by cross-multiplication.
    const rateDiff = sa.correct * sb.seen - sb.correct * sa.seen;
    if (rateDiff !== 0) return rateDiff;
    // Largest remaining target, then tier order, then stable id.
    const remDiff =
      blueprint.targets[b] - sb.served - (blueprint.targets[a] - sa.served);
    if (remDiff !== 0) return remDiff;
    return tierOf(a) - tierOf(b) || a.localeCompare(b);
  });
}

/**
 * Difficulty trial order for one skill (Parts H/J): current state first, then
 * alternating single steps toward the edges, skipping bands whose blueprint
 * cap is already used. Example: current HARD with the HARD cap spent tries
 * MEDIUM next ("SQL + Hard unavailable → SQL + Medium").
 */
export function difficultyTrials(
  state: AdaptiveState,
  blueprint: Blueprint,
  skillId: string,
): Difficulty[] {
  const st = state.skills[skillId];
  if (!st) return [];
  const caps = blueprint.caps[skillId] ?? { EASY: 0, MEDIUM: 0, HARD: 0 };
  const current = st.current;
  const idx = difficultyIndex(current);
  const order: Difficulty[] = [];
  for (const offset of [0, -1, +1, -2, +2]) {
    const i = idx + offset;
    if (i < 0 || i >= DIFFICULTY_ORDER.length) continue;
    const d = DIFFICULTY_ORDER[i];
    if (!order.includes(d)) order.push(d);
  }
  return order.filter((d) => (st.bandUsed[d] ?? 0) < (caps[d] ?? 0));
}
