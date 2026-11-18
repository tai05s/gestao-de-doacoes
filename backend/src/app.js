import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from './middleware/authenticate.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import bazarRoutes from './routes/bazar-routes.js';
import donationRoutes from './routes/donation-routes.js';

const app = express();
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
const allowedOrigins = (process.env.API_ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/doacoes', apiLimiter, authenticate, donationRoutes);
app.use('/api/bazar', apiLimiter, authenticate, bazarRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
