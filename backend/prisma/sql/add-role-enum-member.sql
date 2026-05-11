-- Step 2 of 3: ensure MEMBER exists on enum "Role".
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MEMBER';
