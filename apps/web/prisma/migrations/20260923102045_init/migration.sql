-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('JOB_TRACK', 'TOPIC_TRACK');

-- CreateEnum
CREATE TYPE "AreaClassification" AS ENUM ('GENERAL', 'ROLE_BASED');

-- CreateEnum
CREATE TYPE "AssessmentFlow" AS ENUM ('GENERAL', 'BASIC_MCQ', 'BASIC_SKILLS_MCQ', 'CODING');

-- CreateEnum
CREATE TYPE "AssessmentMode" AS ENUM ('MCQ', 'CODING');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'LIVE');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ExperienceBand" AS ENUM ('Y0_2', 'Y2_5', 'Y5_8');

-- CreateEnum
CREATE TYPE "JdLibrarySource" AS ENUM ('MANUAL', 'AI', 'CSV');

-- CreateEnum
CREATE TYPE "AssessmentJdSource" AS ENUM ('LIBRARY', 'AI_GENERATED', 'USER_PASTED');

-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('QUESTION_LIBRARY', 'AI_GENERATED', 'CODING_LIBRARY', 'AI_CODING_GENERATED');

-- CreateEnum
CREATE TYPE "TestCaseVisibility" AS ENUM ('PUBLIC', 'HIDDEN');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN_ADD_ONLY', 'ADMIN_FULL');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('CONFIGURING', 'GENERATED', 'PREVIEW', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AssessmentSkillSource" AS ENUM ('USER_SELECTED', 'JD', 'JOB_TITLE');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "CategoryKind" NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaOfInterest" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "classification" "AreaClassification" NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaOfInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTitle" (
    "id" TEXT NOT NULL,
    "areaOfInterestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "assessmentFlow" "AssessmentFlow" NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDescription" (
    "id" TEXT NOT NULL,
    "jobTitleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "experienceBand" "ExperienceBand" NOT NULL,
    "source" "JdLibrarySource" NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDescriptionSkill" (
    "jobDescriptionId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "JobDescriptionSkill_pkey" PRIMARY KEY ("jobDescriptionId","skillId")
);

-- CreateTable
CREATE TABLE "JobTitleSkill" (
    "jobTitleId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "JobTitleSkill_pkey" PRIMARY KEY ("jobTitleId","skillId")
);

-- CreateTable
CREATE TABLE "AdminProfile" (
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "assessmentFlow" "AssessmentFlow" NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionSkill" (
    "questionId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "QuestionSkill_pkey" PRIMARY KEY ("questionId","skillId")
);

-- CreateTable
CREATE TABLE "QuestionArea" (
    "questionId" TEXT NOT NULL,
    "areaOfInterestId" TEXT NOT NULL,

    CONSTRAINT "QuestionArea_pkey" PRIMARY KEY ("questionId","areaOfInterestId")
);

-- CreateTable
CREATE TABLE "QuestionJobTitle" (
    "questionId" TEXT NOT NULL,
    "jobTitleId" TEXT NOT NULL,

    CONSTRAINT "QuestionJobTitle_pkey" PRIMARY KEY ("questionId","jobTitleId")
);

-- CreateTable
CREATE TABLE "CodingQuestion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "problemStatement" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "language" TEXT NOT NULL,
    "starterCode" TEXT,
    "constraints" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingTestCase" (
    "id" TEXT NOT NULL,
    "codingQuestionId" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "visibility" "TestCaseVisibility" NOT NULL,

    CONSTRAINT "CodingTestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingQuestionSkill" (
    "codingQuestionId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "CodingQuestionSkill_pkey" PRIMARY KEY ("codingQuestionId","skillId")
);

-- CreateTable
CREATE TABLE "CodingQuestionJobTitle" (
    "codingQuestionId" TEXT NOT NULL,
    "jobTitleId" TEXT NOT NULL,

    CONSTRAINT "CodingQuestionJobTitle_pkey" PRIMARY KEY ("codingQuestionId","jobTitleId")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "flow" "AssessmentFlow" NOT NULL,
    "mode" "AssessmentMode",
    "categoryId" TEXT NOT NULL,
    "areaOfInterestId" TEXT NOT NULL,
    "jobTitleId" TEXT,
    "difficulty" "Difficulty" NOT NULL,
    "experienceBand" "ExperienceBand",
    "requestedQuestionCount" INTEGER NOT NULL,
    "previewEnabled" BOOLEAN NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'CONFIGURING',
    "jdId" TEXT,
    "jdSource" "AssessmentJdSource",
    "jdContentSnapshot" TEXT,
    "clientRequestId" TEXT,
    "finalScore" INTEGER,
    "finalPercentage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSkill" (
    "assessmentId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "sources" "AssessmentSkillSource"[],

    CONSTRAINT "AssessmentSkill_pkey" PRIMARY KEY ("assessmentId","skillId")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "source" "QuestionSource" NOT NULL,
    "libraryQuestionId" TEXT,
    "codingQuestionId" TEXT,
    "skillId" TEXT,
    "questionSnapshot" JSONB NOT NULL,
    "replacedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAnswer" (
    "id" TEXT NOT NULL,
    "assessmentQuestionId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "selectedOptionId" TEXT,
    "submittedCode" TEXT,
    "passedTestCount" INTEGER,
    "totalTestCount" INTEGER,
    "isCorrect" BOOLEAN NOT NULL,
    "score" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuestionHistory" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "questionId" TEXT,
    "codingQuestionId" TEXT,
    "lastAnsweredAt" TIMESTAMP(3) NOT NULL,
    "lastCorrectAt" TIMESTAMP(3),

    CONSTRAINT "UserQuestionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AreaOfInterest_slug_key" ON "AreaOfInterest"("slug");

-- CreateIndex
CREATE INDEX "AreaOfInterest_categoryId_idx" ON "AreaOfInterest"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaOfInterest_categoryId_name_key" ON "AreaOfInterest"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "JobTitle_slug_key" ON "JobTitle"("slug");

-- CreateIndex
CREATE INDEX "JobTitle_areaOfInterestId_idx" ON "JobTitle"("areaOfInterestId");

-- CreateIndex
CREATE UNIQUE INDEX "JobTitle_areaOfInterestId_name_key" ON "JobTitle"("areaOfInterestId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_normalizedName_key" ON "Skill"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "JobDescription_jobTitleId_idx" ON "JobDescription"("jobTitleId");

-- CreateIndex
CREATE INDEX "JobDescriptionSkill_skillId_idx" ON "JobDescriptionSkill"("skillId");

-- CreateIndex
CREATE INDEX "JobTitleSkill_skillId_idx" ON "JobTitleSkill"("skillId");

-- CreateIndex
CREATE INDEX "Question_assessmentFlow_difficulty_status_idx" ON "Question"("assessmentFlow", "difficulty", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOption_questionId_position_key" ON "QuestionOption"("questionId", "position");

-- CreateIndex
CREATE INDEX "QuestionSkill_skillId_idx" ON "QuestionSkill"("skillId");

-- CreateIndex
CREATE INDEX "QuestionArea_areaOfInterestId_idx" ON "QuestionArea"("areaOfInterestId");

-- CreateIndex
CREATE INDEX "QuestionJobTitle_jobTitleId_idx" ON "QuestionJobTitle"("jobTitleId");

-- CreateIndex
CREATE INDEX "CodingQuestion_difficulty_status_idx" ON "CodingQuestion"("difficulty", "status");

-- CreateIndex
CREATE INDEX "CodingTestCase_codingQuestionId_visibility_idx" ON "CodingTestCase"("codingQuestionId", "visibility");

-- CreateIndex
CREATE INDEX "CodingQuestionSkill_skillId_idx" ON "CodingQuestionSkill"("skillId");

-- CreateIndex
CREATE INDEX "CodingQuestionJobTitle_jobTitleId_idx" ON "CodingQuestionJobTitle"("jobTitleId");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_clientRequestId_key" ON "Assessment"("clientRequestId");

-- CreateIndex
CREATE INDEX "Assessment_userId_status_idx" ON "Assessment"("userId", "status");

-- CreateIndex
CREATE INDEX "Assessment_userId_createdAt_idx" ON "Assessment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_libraryQuestionId_idx" ON "AssessmentQuestion"("libraryQuestionId");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_codingQuestionId_idx" ON "AssessmentQuestion"("codingQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_sequence_key" ON "AssessmentQuestion"("assessmentId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_libraryQuestionId_key" ON "AssessmentQuestion"("assessmentId", "libraryQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_codingQuestionId_key" ON "AssessmentQuestion"("assessmentId", "codingQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAnswer_assessmentQuestionId_key" ON "UserAnswer"("assessmentQuestionId");

-- CreateIndex
CREATE INDEX "UserAnswer_userId_submittedAt_idx" ON "UserAnswer"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "UserQuestionHistory_userId_lastCorrectAt_idx" ON "UserQuestionHistory"("userId", "lastCorrectAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuestionHistory_userId_questionId_key" ON "UserQuestionHistory"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuestionHistory_userId_codingQuestionId_key" ON "UserQuestionHistory"("userId", "codingQuestionId");

-- AddForeignKey
ALTER TABLE "AreaOfInterest" ADD CONSTRAINT "AreaOfInterest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTitle" ADD CONSTRAINT "JobTitle_areaOfInterestId_fkey" FOREIGN KEY ("areaOfInterestId") REFERENCES "AreaOfInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDescription" ADD CONSTRAINT "JobDescription_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDescriptionSkill" ADD CONSTRAINT "JobDescriptionSkill_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "JobDescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDescriptionSkill" ADD CONSTRAINT "JobDescriptionSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTitleSkill" ADD CONSTRAINT "JobTitleSkill_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTitleSkill" ADD CONSTRAINT "JobTitleSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSkill" ADD CONSTRAINT "QuestionSkill_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSkill" ADD CONSTRAINT "QuestionSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionArea" ADD CONSTRAINT "QuestionArea_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionArea" ADD CONSTRAINT "QuestionArea_areaOfInterestId_fkey" FOREIGN KEY ("areaOfInterestId") REFERENCES "AreaOfInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionJobTitle" ADD CONSTRAINT "QuestionJobTitle_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionJobTitle" ADD CONSTRAINT "QuestionJobTitle_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingTestCase" ADD CONSTRAINT "CodingTestCase_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingQuestionSkill" ADD CONSTRAINT "CodingQuestionSkill_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingQuestionSkill" ADD CONSTRAINT "CodingQuestionSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingQuestionJobTitle" ADD CONSTRAINT "CodingQuestionJobTitle_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingQuestionJobTitle" ADD CONSTRAINT "CodingQuestionJobTitle_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_areaOfInterestId_fkey" FOREIGN KEY ("areaOfInterestId") REFERENCES "AreaOfInterest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "JobTitle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_jdId_fkey" FOREIGN KEY ("jdId") REFERENCES "JobDescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSkill" ADD CONSTRAINT "AssessmentSkill_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSkill" ADD CONSTRAINT "AssessmentSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_libraryQuestionId_fkey" FOREIGN KEY ("libraryQuestionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_assessmentQuestionId_fkey" FOREIGN KEY ("assessmentQuestionId") REFERENCES "AssessmentQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "QuestionOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestionHistory" ADD CONSTRAINT "UserQuestionHistory_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestionHistory" ADD CONSTRAINT "UserQuestionHistory_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
