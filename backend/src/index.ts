import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import challengeRoutes from './routes/challenge.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import assistantRoutes from './routes/assistant.routes';
import { startScheduler } from './services/scheduler';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Detrás del proxy del hosting (Render, Railway…) hace falta para ver la IP real del cliente (rate limit).
app.set('trust proxy', 1);

// La app móvil no usa CORS; solo el navegador. CORS_ORIGIN puede ser una lista separada por comas.
const origins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim());
app.use(cors(origins ? { origin: origins } : undefined));
app.use(express.json({ limit: '100kb' }));

app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assistant', assistantRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LINEDU API is running' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  startScheduler();
});
