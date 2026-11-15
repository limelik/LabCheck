import express from 'express';
import { catalogRouter } from './routes/catalog.js';
import { attachmentRouter } from './routes/attachments.js';
import { accountRouter } from './routes/accounts.js';
import cookieParser from 'cookie-parser';
import { query } from './db.js';
import { config } from './config.js';
import { asyncRoute, errorHandler } from './http.js';
import { academicRouter } from './routes/academic.js';
import { offeringRouter } from './routes/offerings.js';
import { assessmentRouter } from './routes/assessment.js';
import { requestRouter } from './routes/requests.js';
import { dashboardRouter } from './routes/dashboards.js';
import { authRouter, authenticate } from './routes/auth.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustedProxy);
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    (req.get('X-LabCheck-Request') !== '1' ||
      (req.get('Origin') &&
        req.get('Origin') !== new URL(config.publicUrl).origin))
  ) {
    return res.status(403).json({
      error: {
        code: 'CSRF_REJECTED',
        message: 'Request must come from the LabCheck application.',
      },
    });
  }
  next();
});
app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());

app.get(
  '/api/health',
  asyncRoute(async (_req, res) => {
    await query('SELECT 1 AS ok');
    res.json({ status: 'ok', database: 'connected' });
  }),
);
app.use('/api/auth', authRouter);
app.use(
  '/api',
  authenticate,
  catalogRouter,
  attachmentRouter,
  accountRouter,
  academicRouter,
  offeringRouter,
  assessmentRouter,
  requestRouter,
  dashboardRouter,
);
app.use('/api', (_req, res) =>
  res
    .status(404)
    .json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found.' } }),
);
app.use(errorHandler);
