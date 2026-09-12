import 'reflect-metadata'

// Polyfill defensif jika bundler memotong decorator metadata
if (typeof Reflect !== 'undefined') {
  const r = Reflect as any
  if (!r.getMetadata) r.getMetadata = () => undefined
  if (!r.getOwnMetadata) r.getOwnMetadata = () => undefined
}

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'node:path'

const dbPath = path.resolve(process.cwd(), 'data', 'station.db')
const sqlite = new Database(dbPath)

// Create tables if not exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS metrics_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    cpu_percent REAL NOT NULL,
    cpu_temp REAL NOT NULL,
    gpu_temp REAL NOT NULL,
    ram_percent REAL NOT NULL,
    ram_used_gb REAL NOT NULL,
    net_down_kb REAL NOT NULL,
    net_up_kb REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dev_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT NOT NULL,
    port INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auth_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    transports TEXT,
    device_name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auth_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pin_hash TEXT NOT NULL,
    pin_salt TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    session_ttl_seconds INTEGER NOT NULL DEFAULT 86400,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auth_challenges (
    id TEXT PRIMARY KEY,
    challenge TEXT NOT NULL,
    purpose TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
`)

// Safe column migrations for existing SQLite database
try {
  sqlite.exec(`ALTER TABLE auth_settings ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;`)
} catch {}
try {
  sqlite.exec(`ALTER TABLE auth_settings ADD COLUMN locked_until INTEGER NOT NULL DEFAULT 0;`)
} catch {}

export const db = drizzle(sqlite, { schema })
