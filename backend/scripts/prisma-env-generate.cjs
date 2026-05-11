/**
 * Runs `prisma generate` with DIRECT_URL defaulted from DATABASE_URL when unset.
 * Avoids shell-quoting issues in Vercel install/build commands for pooled URLs.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const pkgRoot = path.join(__dirname, '..');
if (!String(process.env.DIRECT_URL || '').trim() && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

let prismaEntry;
try {
  prismaEntry = require.resolve('prisma/build/index.js', { paths: [pkgRoot] });
} catch {
  console.error('prisma-env-generate: prisma package not found. Run npm install from backend/.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [prismaEntry, 'generate'], {
  stdio: 'inherit',
  cwd: pkgRoot,
  env: process.env,
});

process.exit(result.status === 0 ? 0 : result.status ?? 1);
