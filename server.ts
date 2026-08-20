import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = process.env.VERCEL === '1';
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

  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL
  );
`);

// Migration: Add columns if missing
try {
  db.prepare('ALTER TABLE settings ADD COLUMN accessCode TEXT DEFAULT "00223"').run();
} catch (e) {}

try {
  db.prepare('ALTER TABLE students ADD COLUMN studentIdNumber TEXT').run();
} catch (e) {}

try {
  db.prepare('ALTER TABLE students ADD COLUMN emergencyContact TEXT').run();
} catch (e) {}

try {
  db.prepare('ALTER TABLE students ADD COLUMN photoUrl TEXT').run();
} catch (e) {}

// Ensure default general settings exist
try {
  const existingSettings = db.prepare('SELECT id FROM settings WHERE id = ?').get('general');
  if (!existingSettings) {
    db.prepare('INSERT INTO settings (id, centerName, accessCode, logoUrl) VALUES (?, ?, ?, ?)').run('general', 'kalan gest KG', '00223', '');
  }
} catch (e) {
  console.error("Error checking/inserting settings:", e);
}

// Middleware to check authentication using database
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Non autorisé. Veuillez vous connecter.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
    if (session) {
      next();
    } else {
      res.status(401).json({ error: 'Session expirée ou invalide.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la vérification de la session.' });
  }
};

const app = express();

async function startServer() {
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' })); // Increased limit for base64 logos

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Direct access to general settings
  app.get('/api/settings/general', (req, res) => {
    try {
      const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get('general');
      res.json(settings || { id: 'general', centerName: 'kalan gest KG', accessCode: '00223' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Protect specialized settings update
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

  // Helper to generate IDs (simplified for this migration)
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Auth route
  app.post('/api/auth/verify', (req, res) => {
    const { code } = req.body;
    try {
      const settings = db.prepare('SELECT accessCode FROM settings WHERE id = ?').get('general') as any;
      const validCode = settings?.accessCode || '00223';
      
      if (code === validCode) {
        const token = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
        const now = new Date().toISOString();
        db.prepare('INSERT INTO sessions (token, createdAt) VALUES (?, ?)').run(token, now);
        res.json({ success: true, token, user: { email: 'admin@example.com', uid: 'local-admin' } });
      } else {
        res.status(401).json({ success: false, error: 'Code incorrect' });
      }
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      } catch (e) {
        console.error("Logout error in DB:", e);
      }
    }
    res.json({ success: true });
  });

  // Bulk student import route - Protected
  app.post('/api/students/bulk', authenticate, (req, res) => {
    const { students: studentItems } = req.body;
    if (!Array.isArray(studentItems) || studentItems.length === 0) {
      return res.status(400).json({ error: "Liste d'élèves invalide." });
    }

    try {
      const insertStudent = db.prepare(`
        INSERT INTO students (id, firstName, lastName, phoneNumber, email, studentIdNumber, emergencyContact, registrationDate, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertEnrollment = db.prepare(`
        INSERT INTO enrollments (id, studentId, courseId, startDate, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      const createdCount = { students: 0, enrollments: 0 };

      const transaction = db.transaction((items: any[]) => {
        for (const item of items) {
          const id = generateId();
          const regDate = item.registrationDate || now.split('T')[0];
          const status = item.status || 'active';

          insertStudent.run(
            id,
            item.firstName,
            item.lastName,
            item.phoneNumber || '',
            item.email || '',
            item.studentIdNumber || '',
            item.emergencyContact || '',
            regDate,
            status,
            now,
            now
          );
          createdCount.students++;

          if (Array.isArray(item.courseIds) && item.courseIds.length > 0) {
            for (const courseId of item.courseIds) {
              const enrollmentId = generateId();
              insertEnrollment.run(
                enrollmentId,
                id,
                courseId,
                now,
                'active',
                now,
                now
              );
              createdCount.enrollments++;
            }
          }
        }
      });

      transaction(studentItems);

      res.json({ success: true, count: createdCount });
    } catch (error) {
      console.error("Bulk import error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Generic API routes - Protected
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
      // Relational integrity checks
      if (collection === 'enrollments' || collection === 'payments') {
        const studentId = data.studentId;
        const student = db.prepare('SELECT id FROM students WHERE id = ?').get(studentId);
        if (!student) {
          return res.status(400).json({ error: "L'étudiant spécifié n'existe pas." });
        }

        if (data.courseId) {
          const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(data.courseId);
          if (!course) {
            return res.status(400).json({ error: "Le cours spécifié n'existe pas." });
          }
        }
      }

      const keys = ['id', 'createdAt', 'updatedAt', ...Object.keys(data)];
      const values = [id, now, now, ...Object.values(data)];
      const placeholders = keys.map(() => '?').join(',');
      const quotedKeys = keys.map(k => `"${k}"`).join(',');
      
      db.prepare(`INSERT INTO "${collection}" (${quotedKeys}) VALUES (${placeholders})`).run(...values);
      res.json({ id, createdAt: now, updatedAt: now, ...data });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/:collection/:id', authenticate, (req, res) => {
    const { collection, id } = req.params;
    const data = req.body;
    const now = new Date().toISOString();
    
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClause = keys.map(k => `"${k}" = ?`).join(',');
      
      db.prepare(`UPDATE "${collection}" SET ${setClause}, updatedAt = ? WHERE id = ?`).run(...values, now, id);
      res.json({ success: true, updatedAt: now });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/:collection/:id', authenticate, (req, res) => {
    const { collection, id } = req.params;
    try {
      // Basic relational check
      if (collection === 'students') {
        const enrollments = db.prepare('SELECT id FROM enrollments WHERE studentId = ?').all(id);
        if (enrollments.length > 0) {
          return res.status(400).json({ error: 'Impossible de supprimer cet étudiant car il a des inscriptions actives.' });
        }
      }
      
      db.prepare(`DELETE FROM "${collection}" WHERE id = ?`).run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
