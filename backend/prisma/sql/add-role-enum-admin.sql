-- Step 1 of 3: add ADMIN to Postgres enum "Role" (run alone; commit before next step).
-- Postgres 15+: IF NOT EXISTS. Run: npx prisma db execute --file prisma/sql/add-role-enum-admin.sql

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN';
