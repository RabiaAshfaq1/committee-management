/**
 * Vercel serverless entry. Uses compiled `dist/` from `npm run build` (see vercel.json buildCommand).
 * Importing `../src/index` breaks many Vercel builds (bundle / path resolution).
 */
import type { Express } from 'express';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod = require('../dist/index.js') as { default: Express };

export default mod.default;
