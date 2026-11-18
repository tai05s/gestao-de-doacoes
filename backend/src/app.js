import cors from 'cors';
import express from 'express';
import { authenticate } from './middleware/authenticate.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import bazarRoutes from './routes/bazar-routes.js';
import donationRoutes from './routes/donation-routes.js';

const app = express();
const allowedOrigins = (process.env.API_ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/doacoes', authenticate, donationRoutes);
app.use('/api/bazar', authenticate, bazarRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
