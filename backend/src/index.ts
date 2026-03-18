import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes      from './routes/auth';
import tableRoutes     from './routes/tables';
import orderRoutes     from './routes/orders';
import menuRoutes      from './routes/menu';
import dashboardRoutes   from './routes/dashboard';
import promotionsRoutes  from './routes/promotions';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth',      authRoutes);
app.use('/api/tables',    tableRoutes);
app.use('/api/orders',    orderRoutes);
app.use('/api/menu',      menuRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/promotions',  promotionsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log('👤 Usuarios demo:');
  console.log('   mesero@restaurante.com / 1234');
  console.log('   cocina@restaurante.com / 1234');
  console.log('   gerente@restaurante.com / 1234');
});
