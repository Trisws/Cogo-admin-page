import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Cấu hình kết nối Supabase PostgreSQL
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 6543,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DATABASE,
  ssl: { rejectUnauthorized: false },
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // --- API Routes ---
  app.get('/api/health', async (req, res) => {
    try {
      const result = await pool.query('SELECT NOW()');
      res.json({ status: 'ok', db_time: result.rows[0].now });
    } catch (err) {
      console.error('Database connection error:', err);
      res.status(500).json({ status: 'error', error: String(err) });
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT u.*, r."Diem_den" AS destination
        FROM users u
        LEFT JOIN LATERAL (
          SELECT "Diem_den"
          FROM rides
          WHERE rides.id_user = u.id_user AND rides."Diem_den" IS NOT NULL
          ORDER BY rides.created_at DESC
          LIMIT 1
        ) r ON true
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ status: 'error', error: String(err) });
    }
  });

  app.get('/api/vehicles', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT v.*, u.name AS driver_name
        FROM vehicles v
        LEFT JOIN users u ON u.id_user = v.id_user
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      res.status(500).json({ status: 'error', error: String(err) });
    }
  });

  // --- Vite Middleware (Development) / Static Files (Production) ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
