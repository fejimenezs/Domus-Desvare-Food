
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import offersRoutes from './routes/offers.js';
import notificationsRoutes from './routes/notifications.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.get('/', (req, res) => { res.json({ message: 'BidBite API running' }); });
app.use((err, req, res, next) => { console.error('Unhandled error:', err); res.status(500).json({ error: 'Error interno del servidor' }); });
app.listen(PORT, () => { console.log(`Server running on http://localhost:${PORT}`); });
