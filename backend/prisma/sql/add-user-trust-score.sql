-- Fix "column User.trustScore does not exist" so registration / Prisma User queries work.
-- Run once in Supabase: SQL Editor → New query → paste → Run.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trustScore" INTEGER NOT NULL DEFAULT 0;
