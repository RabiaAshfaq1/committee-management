/**
 * Vercel looks for `index.ts` at the project root (folder set as "Root Directory").
 * Local runs still use `src/index.ts` via `npm run build` / `npm start` → `dist/index.js`.
 */
import app from './src/index';

export default app;
