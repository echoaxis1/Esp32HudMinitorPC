import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const metricsHistory = sqliteTable('metrics_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: integer('timestamp').notNull(),
  cpuPercent: real('cpu_percent').notNull(),
  cpuTemp: real('cpu_temp').notNull(),
  gpuTemp: real('gpu_temp').notNull(),
  ramPercent: real('ram_percent').notNull(),
  ramUsedGb: real('ram_used_gb').notNull(),
  netDownKb: real('net_down_kb').notNull(),
  netUpKb: real('net_up_kb').notNull(),
})

export const devBookmarks = sqliteTable('dev_bookmarks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  category: text('category').notNull(),
  port: integer('port'),
  createdAt: integer('created_at').notNull(),
})
