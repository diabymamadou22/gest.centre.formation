import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import path from 'path';

const isVercel = process.env.VERCEL === '1';
// Sur Vercel, on utilise /tmp pour le stockage temporaire (attention: non permanent)
const dbPath = isVercel ? '/tmp/database.db' : 'database.db';
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    dateOfBirth TEXT,
    registrationDate TEXT,
    phoneNumber TEXT,
    email TEXT,
    status TEXT DEFAULT 'active',
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    teacher TEXT,
    schedule TEXT,
    price REAL NOT NULL,
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    courseId TEXT NOT NULL,
    startDate TEXT,
    status TEXT DEFAULT 'active',
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY(studentId) REFERENCES students(id),
    FOREIGN KEY(courseId) REFERENCES courses(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    courseId TEXT,
    amount REAL NOT NULL,
    paymentDate TEXT,
    paymentMethod TEXT,
    description TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY(studentId) REFERENCES students(id),
    FOREIGN KEY(courseId) REFERENCES courses(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    centerName TEXT NOT NULL,
    address TEXT,
    phoneNumber TEXT,
    email TEXT,
    logoUrl TEXT,
    accessCode TEXT DEFAULT '00223'
  );
`);

// Migration and default settings
try {
  db.prepare('ALTER TABLE settings ADD COLUMN accessCode TEXT DEFAULT "00223"').run();
} catch (e) {}

try {
  const existingSettings = db.prepare('SELECT id FROM settings WHERE id = ?').get('general');
  if (!existingSettings) {
    db.prepare('INSERT INTO settings (id, centerName, accessCode, logoUrl) VALUES (?, ?, ?, ?)').run('general', 'Nafissatou Tounkara', '00223', '');
  }
} catch (e) {}

const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });
  const token = authHeader.split(' ')[1];
  try {
    const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
    if (session) next();
    else res.status(401).json({ error: 'Session expirée' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur session' });
  }
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const generateId = () => Math.random().toString(36).substr(2, 9);

// API Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/settings/general', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get('general');
    res.json(settings || { id: 'general', centerName: 'Nafissatou Tounkara', accessCode: '00223' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/settings/general', authenticate, (req, res) => {
  const data = req.body;
  try {
    const keys = Object.keys(data);
    if (keys.length === 0) return res.json({ success: true });
    const values = Object.values(data);
    const setClause = keys.map(k => `"${k}" = ?`).join(',');
    db.prepare(`UPDATE settings SET ${setClause} WHERE id = ?`).run(...values, 'general');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/auth/verify', (req, res) => {
  const { code } = req.body;
  try {
    const settings = db.prepare('SELECT accessCode FROM settings WHERE id = ?').get('general') as any;
    if (code === (settings?.accessCode || '00223')) {
      const token = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
      db.prepare('INSERT INTO sessions (token, createdAt) VALUES (?, ?)').run(token, new Date().toISOString());
      res.json({ success: true, token, user: { email: 'admin@example.com', uid: 'local-admin' } });
    } else {
      res.status(401).json({ success: false, error: 'Code incorrect' });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try { db.prepare('DELETE FROM sessions WHERE token = ?').run(token); } catch (e) {}
  }
  res.json({ success: true });
});

app.get('/api/:collection', authenticate, (req, res) => {
  const { collection } = req.params;
  try {
    const rows = db.prepare(`SELECT * FROM "${collection}"`).all();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/:collection', authenticate, (req, res) => {
  const { collection } = req.params;
  const { id: providedId, ...data } = req.body;
  const id = providedId || generateId();
  const now = new Date().toISOString();
  try {
    if (collection === 'enrollments' || collection === 'payments') {
      const student = db.prepare('SELECT id FROM students WHERE id = ?').get(data.studentId);
      if (!student) return res.status(400).json({ error: "L'étudiant n'existe pas" });
    }
    const keys = ['id', 'createdAt', 'updatedAt', ...Object.keys(data)];
    const values = [id, now, now, ...Object.values(data)];
    const placeholders = keys.map(() => '?').join(',');
    const quotedKeys = keys.map(k => `"${k}"`).join(',');
    db.prepare(`INSERT INTO "${collection}" (${quotedKeys}) VALUES (${placeholders})`).run(...values);
    res.json({ id, ...data });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/:collection/:id', authenticate, (req, res) => {
  const { collection, id } = req.params;
  const data = req.body;
  try {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(k => `"${k}" = ?`).join(',');
    db.prepare(`UPDATE "${collection}" SET ${setClause}, updatedAt = ? WHERE id = ?`).run(...values, new Date().toISOString(), id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/:collection/:id', authenticate, (req, res) => {
  const { collection, id } = req.params;
  try {
    db.prepare(`DELETE FROM "${collection}" WHERE id = ?`).run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default app;
