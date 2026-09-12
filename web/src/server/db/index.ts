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
`)

export const db = drizzle(sqlite, { schema })
