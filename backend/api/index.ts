/**
 * Vercel entry (see KB: "Using Express.js with Vercel").
 * All traffic is rewritten here; import the real app from src so paths like /api/auth/login work.
 */
import app from '../src/index';

export default app;
