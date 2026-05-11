import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes';
import committeeRoutes from './routes/committee.routes';
import memberRoutes from './routes/member.routes';
import roundRoutes from './routes/round.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Echo caller Origin (works for Vercel frontend → Vercel API). JWT in header — no cookies, so credentials:false avoids CORS edge cases.
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Root (browser / uptime checks)
app.get('/', (_req, res) => {
  res.json({
    service: 'committee-management-api',
    health: '/health',
    api: '/api/auth, /api/committees, …',
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/committees', committeeRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/rounds', roundRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// Local / `node dist/index.js`: listen. Vercel sets VERCEL=1 — no listen (api/index.js loads this file).
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
