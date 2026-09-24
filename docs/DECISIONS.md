# Assessment AI — Decision Log

Source of truth for product/architecture decisions taken during the audit
(2026-09-22). The specification lives in `docs/spec/admin-flow.pdf`
(and `docs/spec/admin-flow.txt`). Where the spec's two internal schema
proposals conflicted, the resolutions below govern.

## Schema decisions (C1–C10, approved)

| # | Topic | Resolution |
|---|---|---|
| C1 | Taxonomy | `Category` → `AreaOfInterest` → `JobTitle`. Both spec parts agree. |
| C2 | Track flags | Keep both: `Category.kind {JOB_TRACK, TOPIC_TRACK}` (does the admin hierarchy have Job Titles?) and `AreaOfInterest.classification {GENERAL, ROLE_BASED}` (user-flow routing, drives the `nextStep` contract). Invariant: a `TOPIC_TRACK` category must not contain a `ROLE_BASED` area. |
| C3 | Flows | `AssessmentFlow {GENERAL, BASIC_MCQ, BASIC_SKILLS_MCQ, CODING}` — exactly four flows. `GENERAL` stored on `AreaOfInterest`, the other three on `JobTitle`. Flow 4's MCQ/Coding choice is a separate `AssessmentMode {MCQ, CODING}` field — never a fifth flow. "Create Your Own Assessment" configures Flow 3. |
| C4 | Status | `PublishStatus {DRAFT, LIVE}` enum on Category, AreaOfInterest, JobTitle, JobDescription, Question, CodingQuestion. Not a boolean. |
| C5 | Admins | Supabase `auth.users` owns identity. `AdminProfile { userId PK/FK, name, role AdminRole {ADMIN_ADD_ONLY, ADMIN_FULL}, isActive }`. No second email/password store. |
| C6 | JD sources | Two distinct enums: `JobDescription.source JdLibrarySource {MANUAL, AI, CSV}` (how a JD entered the library) and `Assessment.jdSource AssessmentJdSource {LIBRARY, AI_GENERATED, USER_PASTED}` (where this assessment's JD came from). `jdSource` must never affect question-library eligibility (spec §9). |
| C7 | MCQ options | `QuestionOption { id, questionId, text, isCorrect, position }` rows (not a JSON blob). Enables FK from `UserAnswer.selectedOptionId` and per-query exclusion of `isCorrect`. |
| C8 | Question tables | Separate `Question` (MCQ) + `QuestionOption`, and `CodingQuestion` + `CodingTestCase { visibility PUBLIC \| HIDDEN }` + `CodingQuestionSkill`. No shared table, no `QuestionKind` discriminator column. |
| C9 | Provenance | `QuestionSource {QUESTION_LIBRARY, AI_GENERATED, CODING_LIBRARY, AI_CODING_GENERATED}` stored on `AssessmentQuestion` (spec §51), not on library tables. |
| C10 | AI snapshots | `AssessmentQuestion { id, assessmentId, sequence, libraryQuestionId?, codingQuestionId?, source, skillId?, questionSnapshot Json?, replacedFromId? }`; exactly one of the two FKs non-null. The snapshot is server-side only: it contains answers for scoring and must be stripped from every client read path (highest-risk leak in the design). |

## Product behaviour decisions

| # | Topic | Decision |
|---|---|---|
| D-SUBJ | Question kinds | `QuestionKind {MCQ, CODING}` only. The "Subjective" rows visible in the Question Library mockup (PDF p49) are excluded — spec enum wins. |
| D-EXP | Experience | `ExperienceBand {Y0_2, Y2_5, Y5_8}` on `JobDescription` only (bands seen in JD mockups). Questions are NOT experience-tagged (question form + CSV columns have no such field); explains the spec's "where applicable". |
| D-SCORE | Final Score | 1 point per correct question. Final Percentage = correct / total × 100. Skill percentage per spec §38. |
| D-DEL | Deletes | Hard delete; refused (error) when the row is referenced by any Assessment / AssessmentQuestion / UserAnswer so history survives (spec §48). Cascade to children only when unreferenced. Confirmation dialog in UI. |
| D-30DAY | 30-day rule | Hard. Correctly-answered library questions are excluded for 30 days; when the eligible pool is insufficient, AI generates the remainder — up to the full requested count (spec §35 guarantee always holds). |
| D-DIST | Selection engine | Round-robin even split of `requestedCount` across final skills; within each skill's quota apply priority tiers: 1. user-selected skills, 2. JD skills, 3. Job Title tags (spec §17). AI fallback inherits the same per-skill quotas. |
| D-ADAPT | Adaptive V1 (Phase 8) | Optional MODE on existing flows (`Assessment.adaptiveEnabled`; BASIC_MCQ + BASIC_SKILLS_MCQ only) — never a fifth flow; adaptive forces Preview OFF. Blueprint is derived, never invented: per-skill targets = D-DIST even split of the requested count over the tier-ordered final skill set (remainder to earlier tiers); band caps per target q around the START difficulty: center = max(1, floor(q/2)), lower = ceil(rest/2), upper = rest - lower, mapped through clamped ±1 steps (edge starts merge the outer band). Per-skill difficulty walk: correct +1 / incorrect −1, clamped EASY..HARD — single steps only. Skill need order: unseen first (tier order), then lowest correct-rate (cross-multiplied fractions), ties by largest remaining target → tier → id; skills at target are excluded (min/max coverage). Selection fallback: current band → adjacent bands with cap room → next skill → controlled insufficient-pool (finish early, graded on served count; AI gap-fill deferred). No stored adaptive state: replayed from served AssessmentQuestion rows (snapshot-frozen difficulty) + UserAnswers, so refresh/resume converge; double-answer/double-advance collapse via UserAnswer + (assessmentId, sequence) uniques. Scoring, results, history and ownership reuse submitMcqAssessment unchanged. |
| D-CODE | Coding correctness | All-or-nothing: correct only if 100% of hidden tests pass. Run Code executes public tests only (spec §24). Pass ratio stored on the attempt, excluded from V1 score. |
| D-NORM | Skill normalization | Exact match on `Skill.normalizedName` (lowercase, trimmed, whitespace-collapsed). Unmatched AI/CSV extractions return as unmapped suggestions; a human creates the Skill. Users can never create skills (spec §14). No fuzzy matching in V1. |
| D-ABANDON | Lifecycle | `AssessmentStatus {CONFIGURING, GENERATED, PREVIEW, IN_PROGRESS, COMPLETED, ABANDONED}`; only valid transitions. `ABANDONED` reserved but never auto-set in V1; IN_PROGRESS assessments resume across refresh/logout. |
| D-LIMITS | Question counts | MCQ flows: 1–50 questions. Coding mode: 1–10 challenges. Bounds AI cost per request. |
| D-GENSKILL | General results | General Assessment results show Final Score + Final Percentage only (spec §39 permits; a per-skill split would equal the total because a general assessment is entered per area). |
| D-DESIGN | Design source | PDF screenshots are the design source of truth (no prototype code exists in any repository). Six candidate screens absent from the PDF (setup, JD screen, Skills Being Tested, preview, taking screen, results) are designed in the same visual language when their phase arrives. |

## Facts extracted from the PDF screenshots

- Admin IA (sidebar): Dashboard · CONTENT: Categories, Areas, Job Titles, Job
  Descriptions, Skills, Questions · ASSESSMENTS: General Assessments · SYSTEM:
  Users, Roles & Permissions, Activity Log, Settings.
- Admin top bar: "Signed in as <name> — can publish", notifications, settings, sign out.
- Question form fields: Type (MCQ), Question, Options A–D, Skill(s), Job Title Tags, Area Tags.
- Excel/CSV import columns: `Kind, Question, OptionA–D, Answer, Difficulty,
  SkillTags, JobTitleTags, AreaTags, StarterCode, ShownTests, HiddenTests, Status`;
  tags separated by `|`; coding tests as `in=>out | …`; `.xlsx` preferred;
  "Download sample Excel" provided.
- Question attachment modes: By job title / By skill / By area of interest
  (maps to `QuestionJobTitle` / `QuestionSkill` / `QuestionArea`).
- Question Library filters: Status, Difficulty, Category, Area, Job Title, Skill
  (+ "Filter by skill" checkbox), grid/list toggle, page size.
- Branding: candidate app = `cm` monogram + "Careermaker.ai";
  admin = blue tile + "ASSESSMENT.AI / Admin".
- Seed scale seen in mockups: 6 categories, 24 areas, 12 job titles, 24 JDs,
  ~20 skills, 1,248 questions.
- UI rules: `Live | Draft | All` status toggle with Live default on every admin
  tab; hierarchical Category → Area → Job Title filters; status-aware action
  dropdowns (no contradictory actions); delete inside dropdown with confirm;
  candidate dashboard uses 5-fully-visible-card carousels with edge chevrons and
  no manual scroll; category filter modal is multi-select (selected = blue);
  "Browse by Category" grid appears only when exactly one category is selected.

## Known-unspecified surfaces

Present in mockups but with no behavioural text anywhere; minimal behaviour
will be proposed when their phase arrives: Activity Log tab, Settings tab,
admin "General Assessments" tab, notification bell, top-bar global search
(text-only requirement exists in "Tab 14" notes).

## Assessment modelling decisions (A1–A4, approved 2026-09-22, Phase 1)

| # | Topic | Decision |
|---|---|---|
| A1 | Assessment vs Attempt | `Assessment` IS the user's concrete instance: userId, status lifecycle, configuration, timestamps. `AssessmentQuestion` and `UserAnswer` hang directly off it. No `AssessmentAttempt` table. A retake = a new Assessment row. Matches §28's field list and §30's "otherwise make ownership/lifecycle explicit". |
| A2 | Identity in tables | Bare `String @db.Uuid` columns (Assessment.userId, UserAnswer.userId, UserQuestionHistory.userId, AdminProfile.userId). No local User table, no cross-schema FK into auth.users. Identity always derived from the Supabase session (Phase 2). |
| A3 | 30-day history | Explicit `UserQuestionHistory { userId, questionId?, codingQuestionId?, lastAnsweredAt, lastCorrectAt? }`, unique per (user, question) pair, updated inside the submit transaction. The 30-day scan is one indexed range query. |
| A4 | Skill scoring attribution | One primary skill per `AssessmentQuestion.skillId` — the skill whose round-robin quota the question filled. §38 percentages never double-count. A question's other library skill tags remain search metadata. Null for GENERAL assessments (D-GENSKILL). |

## Phase 1 derived schema decisions (traced to spec; applied 2026-09-22)

1. `AssessmentQuestion.questionSnapshot Json` NOT NULL for library AND AI
   questions (§48: later edits/deletes of library content must not mutate past
   assessments; one serve-and-strip code path). Server-side only.
2. `Assessment.jdId?` + `jdSource?` + `jdContentSnapshot?` (null for GENERAL) — C6 + §48.
3. `Assessment.clientRequestId String? @unique` — §43 double-click idempotency.
4. `AssessmentSkill.sources AssessmentSkillSource[]` (Postgres array) with
   composite PK (assessmentId, skillId) — §30 multi-origin skills.
5. Single `UserAnswer` table with nullable kind-specific columns
   (selectedOptionId / submittedCode / passedTestCount / totalTestCount);
   `@unique(assessmentQuestionId)` = §43 double-submit protection.
6. `AssessmentQuestion.replacedFromId` plain String (no FK): the replaced row
   is deleted in the same transaction that inserts the replacement.
7. `Assessment.mode` nullable (null for flows 1–3).
8. `Question.assessmentFlow` (Part 3 "assessmentType" column, p49 mockup meta
   line). Omitted on CodingQuestion (structurally CODING).
9. Results: `finalScore`/`finalPercentage` written once at COMPLETED; skill
   breakdown computed server-side at read time from UserAnswer (no
   denormalised drift; §55 reconstructability).
10. `CodingQuestion.language String` — no invented enum; validated against the
    Judge0 language list in Phase 10.
11. Link tables use composite primary keys, no surrogate ids.
12. `Skill.isActive Boolean` (Part 5), not PublishStatus (C4 covers publishable
    content only).
13. `CodingQuestionJobTitle` link table added: §22 searches the coding library
    by job title tags too.
14. Delete semantics encoded as FK actions: taxonomy cascades downward
    (Category→Area→JobTitle→JD, parents→link rows); everything referenced by
    Assessment/AssessmentQuestion/UserAnswer/QuestionOption uses Restrict
    (D-DEL enforced declaratively).

## Phase 1 verification note

`binaries.prisma.sh` (Prisma engine CDN) is unreachable from the build
sandbox, so the native `prisma format/validate/generate/migrate` binaries
cannot run there. Schema authoring was verified with the OFFICIAL engine
compiled to WASM (`@prisma/prisma-schema-wasm` at the exact pinned engine
version 7.1.1-3.c2990dca…, installed with --no-save, sandbox-only): prisma-fmt
canonical, 0 lint diagnostics, validate OK, DMMF builds (22 models, 14 enums).
`prisma migrate dev`, `prisma db seed` and `npm run db:check` require a real
database + engine download and run wherever those are available (owner's
machine or a network-permitted CI).

## Environment variables (names only — no values invented)

| Variable | First needed | Scope |
|---|---|---|
| `DATABASE_URL` | Phase 1 | Server-only (apps/web) |
| `DIRECT_URL` | Phase 1 (migrations via Supabase pooler) | Server-only (apps/web) |
| `NEXT_PUBLIC_SUPABASE_URL` | Phase 2 | Browser-safe |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Phase 2 | Browser-safe (current Supabase key model; legacy anon value accepted under this name) |
| `SUPABASE_SERVICE_ROLE_KEY` | Phase 2 | Server-only, critical |
| `OPENAI_API_KEY` | Phase 6 | Server-only (ai-service) |
| `AI_SERVICE_URL` | Phase 6 | Server-only (apps/web) |
| `AI_SERVICE_SHARED_SECRET` | Phase 6 | Server-only, both sides |
| `JUDGE0_BASE_URL` | Phase 7 (pulled forward from Phase 10) | Server-only (apps/web) |
| `JUDGE0_API_KEY` | Phase 7 (pulled forward from Phase 10) | Server-only (apps/web) |
