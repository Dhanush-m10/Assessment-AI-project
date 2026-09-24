-- Phase 8: Adaptive Assessment V1.
-- Additive, non-destructive: one boolean column with a constant default.
-- Existing rows (all assessments created before Phase 8) become Standard
-- (false) and every existing flow/behavior remains valid and unchanged.
ALTER TABLE "Assessment" ADD COLUMN "adaptiveEnabled" BOOLEAN NOT NULL DEFAULT false;
