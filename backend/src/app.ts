import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { globalErrorHandler } from './middleware/errorHandler';
import { tenantMiddleware } from './middleware/tenant';
import authRoutes      from './routes/auth';
import tableRoutes     from './routes/tables';
import orderRoutes     from './routes/orders';
import menuRoutes      from './routes/menu';
import dashboardRoutes   from './routes/dashboard';
import promotionsRoutes  from './routes/promotions';
import cajaRoutes        from './routes/caja';
import aiRoutes          from './routes/ai';
import kitchenRoutes     from './routes/kitchen';
import usersRoutes       from './routes/users';

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
const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de login. Espera 1 minuto.' },
});

const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite de consultas de IA alcanzado. Espera 1 minuto.' },
});

const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Espera 1 minuto.' },
});

app.use('/api/auth', authLimiter);
app.use('/api/ai',   aiLimiter);
app.use('/api',      apiLimiter);

// HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Tenant middleware — resolves req.store for all /api/* routes
app.use('/api', tenantMiddleware);

app.use('/api/auth',       authRoutes);
app.use('/api/tables',     tableRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/menu',       menuRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/caja',       cajaRoutes);
app.use('/api/ai',         aiRoutes);
app.use('/api/kitchen',    kitchenRoutes);
app.use('/api/users',      usersRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Global error handler — must be last
app.use(globalErrorHandler);

export default app;
