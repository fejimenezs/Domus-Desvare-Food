// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import authRoutes from './routes/auth.js';
import offersRoutes from './routes/offers.js';
import notificationsRoutes from './routes/notifications.js';
import usersRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import { query } from './db/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => { res.json({ message: 'CaseritosApp API running' }); });

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

/**
 * ensureAdmin: crea o actualiza un usuario administrador con role='adm'
 * Lee variables desde .env:
 *  ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_PHONE, BCRYPT_SALT_ROUNDS
 */
async function ensureAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const plain = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'Administrador General';
    const phone = process.env.ADMIN_PHONE || null;
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

    if (!email || !plain) {
      console.log('ensureAdmin: ADMIN_EMAIL o ADMIN_PASSWORD no definidos en .env — omitiendo creación de admin.');
      return;
    }

    // Hashear la contraseña
    const hashed = await bcrypt.hash(plain, saltRounds);

    // Verificar si existe el usuario por email
    const r = await query('SELECT id FROM users WHERE email=$1', [email]);
    if (r.rowCount === 0) {
      await query(
        'INSERT INTO users (email, password, name, phone, role) VALUES ($1,$2,$3,$4,$5)',
        [email, hashed, name, phone, 'adm']
      );
      console.log(`ensureAdmin: usuario admin creado (${email})`);
    } else {
      await query(
        'UPDATE users SET password=$1, role=$2, name=COALESCE($3,name), phone=COALESCE($4,phone) WHERE email=$5',
        [hashed, 'adm', name, phone, email]
      );
      console.log(`ensureAdmin: usuario admin actualizado (${email})`);
    }
  } catch (err) {
    console.error('ensureAdmin error:', err.message || err);
    // no hacer crash aquí — devolvemos el control
  }
}

// arrancar servidor después de asegurar admin
async function start() {
  try {
    await ensureAdmin();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error arrancando el servidor:', err);
    process.exit(1);
  }
}

start();
