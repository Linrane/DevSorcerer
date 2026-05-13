import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { migration001 } from './migrations/001_initial.js';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

export function initDb(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  runMigrations(db);
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  const applied = new Set(
    database
      .prepare('SELECT name FROM _migrations')
      .all()
      .map((r: unknown) => (r as { name: string }).name),
  );

  const migrations = [{ name: '001_initial', up: migration001 }];

  for (const m of migrations) {
    if (!applied.has(m.name)) {
      database.exec(m.up);
      database
        .prepare('INSERT INTO _migrations (name) VALUES (?)')
        .run(m.name);
    }
  }
}
