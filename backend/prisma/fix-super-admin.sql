-- Legacy script: map old elevated roles to current Prisma enum (ADMIN | MEMBER only).
-- Prefer migrate-legacy-user-roles.sql for the full fix.

UPDATE "User" SET role = 'ADMIN' WHERE role::text IN ('SUPER_ADMIN', 'ORGANIZER');
