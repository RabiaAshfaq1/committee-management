# Fixes Prisma vs Postgres Role enum drift (ORGANIZER / missing ADMIN).
# Run from backend/:  pwsh -File scripts/fix-legacy-role-enum.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot/..
npx prisma db execute --file prisma/sql/add-role-enum-admin.sql
npx prisma db execute --file prisma/sql/add-role-enum-member.sql
npx prisma db execute --file prisma/sql/migrate-legacy-user-roles.sql
Write-Host "Done. Enum Role should match Prisma (ADMIN | MEMBER)."
