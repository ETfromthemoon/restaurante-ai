import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes      from './routes/auth';
import tableRoutes     from './routes/tables';
import orderRoutes     from './routes/orders';
import menuRoutes      from './routes/menu';
import dashboardRoutes   from './routes/dashboard';
import promotionsRoutes  from './routes/promotions';
import cajaRoutes        from './routes/caja';
import aiRoutes          from './routes/ai';
import kitchenRoutes     from './routes/kitchen';

dotenv.config();

const app = express();

// --- Security middleware ---
app.use(helmet());

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
  : ['http://localhost:5173'];
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json({ limit: '1mb' }));

// Rate limiters
const authLimiter = rateLimit({ windowMs: 60_000, max: 5, message: { error: 'Demasiados intentos. Espera 1 minuto.' } });
const apiLimiter  = rateLimit({ windowMs: 60_000, max: 100 });
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

app.use('/api/auth',       authRoutes);
app.use('/api/tables',     tableRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/menu',       menuRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/caja',       cajaRoutes);
app.use('/api/ai',         aiRoutes);
app.use('/api/kitchen',    kitchenRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

export default app;
