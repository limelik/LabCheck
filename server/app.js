import express from 'express';
import cookieParser from 'cookie-parser';
import { query } from './db.js';
import { asyncRoute, errorHandler } from './http.js';
import { academicRouter } from './routes/academic.js';
import { offeringRouter } from './routes/offerings.js';
import { assessmentRouter } from './routes/assessment.js';
import { requestRouter } from './routes/requests.js';
import { dashboardRouter } from './routes/dashboards.js';
import { authRouter, authenticate } from './routes/auth.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());

app.get('/api/health', asyncRoute(async (_req, res) => {
  await query('SELECT 1 AS ok');
  res.json({ status: 'ok', database: 'connected' });
}));
app.use('/api/auth', authRouter);
app.use('/api', authenticate, academicRouter, offeringRouter, assessmentRouter, requestRouter, dashboardRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found.' } }));
app.use(errorHandler);
