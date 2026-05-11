-- Step 3 of 3: map legacy roles to ADMIN (run after add-role-enum-*.sql).
UPDATE "User" SET role = 'ADMIN'::"Role" WHERE role::text IN ('ORGANIZER', 'SUPER_ADMIN');
