# 🌐 Web Dashboard Guidelines — TanStack Full-Suite (`web/`)

Dokumen ini adalah panduan arsitektur dan standar implementasi untuk aplikasi **Mac Workstation Mission Control Dashboard** yang dibangun di folder `web/`.

---

## 1. Filosofi & Tumpukan Teknologi (All-in-One TanStack Suite)

Aplikasi ini adalah dashboard full-stack berbasis web yang dirancang khusus untuk lingkungan macOS Apple Silicon M4 dengan memanfaatkan seluruh ekosistem produk **TanStack**:

| Komponen TanStack | Pustaka / Paket | Peran & Tanggung Jawab |
| :--- | :--- | :--- |
| **Meta-Framework** | `@tanstack/react-start` | Full-stack SSR, Nitro server engine, Vite bundler, dan Server Functions (`createServerFn`). |
| **Type-Safe Routing** | `@tanstack/react-router` | File-based routing dengan validasi search params (Zod), layout nesting, dan pending states. |
| **Data Synchronization** | `@tanstack/react-query` | Manajemen server state, caching telemetri hardware, polling / SSE / WebSocket subscription. |
| **Data Visualization** | `@tanstack/react-charts` | Visualisasi grafik riwayat beban 10-core M4, suhu SoC, memori pressure, dan bandwidth I/O. |
| **Data Grid / Table** | `@tanstack/react-table` | Tabel Activity Monitor macOS (daftar proses, PID, CPU, RAM) dengan sorting dan filtering. |
| **Virtual Scrolling** | `@tanstack/react-virtual` | Virtualized list untuk ratusan proses macOS dan socket network tanpa lag DOM. |
| **Client State** | `@tanstack/react-store` | Global reactive state untuk preferensi UI (layout bento box, alert threshold, widget visibility). |
| **Type-Safe Forms** | `@tanstack/react-form` | Input forms untuk trigger tindakan server (switch akun Antigravity, edit port project, dev tools). |

### Database Lokal (Embedded):
- **SQLite (Drizzle ORM + better-sqlite3)**:
  - File database lokal di `data/station.db`.
  - Digunakan untuk mencatat log riwayat telemetri (per menit/jam) agar grafik TanStack Charts memiliki data historis yang persisten saat aplikasi dibuka kembali.

---

## 2. Struktur Folder `web/`

```text
web/
├── app/
│   ├── routes/                     # TanStack Router File-Based Routes
│   │   ├── __root.tsx              # Root layout (Sidebar, Navbar, Theme, Devtools)
│   │   ├── index.tsx               # Dashboard Utama (Bento Grid, 10-Core Equalizer)
│   │   ├── agy.tsx                 # Antigravity AI Token Manager (1-Click Switch)
│   │   ├── processes.tsx           # Activity Monitor (TanStack Table + Virtual)
│   │   └── tools/                  # Tooling Developer Masa Depan
│   │       ├── git.tsx             # Git Repositories Health & Branch Status
│   │       ├── ports.tsx           # Active Ports & Dev Servers Inspector
│   │       └── pm2.tsx             # PM2 & Docker Containers Controller
│   │
│   ├── server/                     # Server Functions (createServerFn)
│   │   ├── system.ts               # Eksekusi server langsung (psutil, sysctl, battery, sensors)
│   │   ├── agy.ts                  # Server action switch akun & keychain management
│   │   └── db/                     # Drizzle ORM Schema & Client
│   │       ├── schema.ts           # Schema tabel (metrics_history, dev_projects, settings)
│   │       └── index.ts            # SQLite client instance
│   │
│   ├── components/                 # UI Components (Tailwind CSS)
│   │   ├── bento/                  # Bento Grid Card Containers
│   │   ├── charts/                 # TanStack Charts wrappers (Equalizer, Sparklines)
│   │   ├── ui/                     # Primitif UI (Button, Badge, Modal, Tooltip)
│   │   └── navigation/             # Sidebar & Command Palette (⌘K)
│   │
│   ├── hooks/                      # Custom hooks (useTelemetry, useAgyQuota)
│   ├── store/                      # TanStack Store (dashboard preferences)
│   ├── router.tsx                  # Instance router
│   └── ssr.tsx / client.tsx        # Entry points TanStack Start
│
├── public/                         # Assets statis
├── app.config.ts                   # Konfigurasi TanStack Start & Nitro
├── tailwind.config.ts              # Konfigurasi Tailwind CSS v4
├── tsconfig.json                   # Strict TypeScript config
└── package.json
```

---

## 3. Standar Desain Visual (Design System)

- **Tema**: Deep OLED Slate Black (`#090D16` / `#0B0F17`) dengan pendaran semitransparan halus (*Subtle Glassmorphism*).
- **Aksen Warna**:
  - `Neon Cyan (#06B6D4)`: Performance Cores (P-Cores) & koneksi jaringan aktif.
  - `Emerald Green (#10B981)`: Efficiency Cores (E-Cores) & status normal.
  - `Amber Gold (#F59E0B)`: Beban menengah / Kuota Claude & GPT.
  - `Rose Coral (#F43F5E)`: Beban kritis (>85%) / Suhu panas (>80°C).
  - `Violet Purple (#8B5CF6)`: AI Tokens & Antigravity Assistant.
- **Tipografi**:
  - Teks & Header: `SF Pro Display` / `Geist Sans`.
  - Metrik & Angka: `JetBrains Mono` / `Geist Mono` untuk keselarasan tabular numerik.

---

## 4. Panduan Menjalankan & Membangun

```bash
cd web

# 1. Pasang dependensi
pnpm install

# 2. Jalankan development server
pnpm dev

# 3. Build untuk produksi
pnpm build

# 4. Preview build produksi
pnpm start
```
