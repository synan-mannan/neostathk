# NeoStats Hackathon Boilerplate

A minimal, clean full-stack starter repository for the **NeoStats Full Stack Engineering Hackathon**.

Contains only the clean architectural foundation needed to start development immediately once the challenge is announced.

---

## 1. Prerequisites

* **Node.js**: `v20.x` or `v22.x` / `v24.x` (Tested with Node `v24.14.0`, npm `v11.9.0`)
* **PostgreSQL**: PostgreSQL 17 running locally on Windows (default `localhost:5432`) or a remote instance (e.g. Neon)
* **PowerShell**: Windows PowerShell 5.1+ or PowerShell 7

---

## 2. Project Structure

```text
neostats-hackathon/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root HTML layout and metadata
│   │   │   ├── page.tsx               # Minimal clean homepage
│   │   │   └── globals.css            # Tailwind directives
│   │   └── lib/
│   │       └── api.ts                 # Reusable, typed HTTP client (apiFetch)
│   ├── .env.example                   # Frontend environment template
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── app.ts                     # Express app (CORS, JSON parser, 404 handler, error middleware)
│   │   ├── server.ts                  # HTTP server entrypoint & graceful shutdown
│   │   ├── config/
│   │   │   └── env.ts                 # Zod environment variable validation
│   │   ├── routes/
│   │   │   └── index.ts               # API router mount point for new challenge routes
│   │   ├── middleware/
│   │   │   └── error.middleware.ts    # Centralized error handler
│   │   └── db/
│   │       └── pool.ts                # pg.Pool PostgreSQL connection pool
│   ├── .env.example                   # Backend environment template
│   ├── tsconfig.json
│   └── package.json
├── .gitignore
├── .env.example                       # Root environment reference
├── package.json                       # Root scripts
└── README.md
```

---

## 3. Environment Configuration

### Backend (`backend/.env`)
Copy the example file:
```powershell
Copy-Item backend/.env.example backend/.env
```
Contents:
```dotenv
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/neostats_hackathon
```

> **Note**: For production on Neon, simply replace `DATABASE_URL` with your Neon connection string (`postgresql://user:password@ep-...neon.tech/neostats_hackathon?sslmode=require`).

### Frontend (`frontend/.env.local`)
Copy the example file:
```powershell
Copy-Item frontend/.env.example frontend/.env.local
```
Contents:
```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 4. Quick Start (Windows PowerShell)

### Step 1: Install Dependencies
Run once from the repository root:
```powershell
npm run install:all
```

### Step 2: Start Services in Separate Terminals

#### Terminal 1 — Backend API
```powershell
npm run dev:backend
```
*The server starts immediately on `http://localhost:4000` without requiring an active database connection.*

#### Terminal 2 — Frontend Application
```powershell
npm run dev:frontend
```
*Access the homepage at `http://localhost:3000`.*

---

## 5. Build and Production Scripts

From the repository root:
```powershell
# Build both services
npm run build:backend
npm run build:frontend

# Start backend compiled production server
npm run start --prefix backend

# Start frontend production server
npm run start --prefix frontend
```

---

## 6. Where to Add Challenge Code

* **Frontend Pages & UI**:
  Create new pages under `frontend/src/app/<route>/page.tsx`.
* **API Client Calls**:
  Use `apiFetch<T>('/api/...')` from `frontend/src/lib/api.ts`.
* **Backend API Routes**:
  Create route files under `backend/src/routes/` and register them in `backend/src/routes/index.ts`.
* **Controllers & Services**:
  Add `backend/src/controllers/` and `backend/src/services/` for business logic as needed.
* **Database Queries**:
  Import `pool` from `backend/src/db/pool.ts` to execute parameterized queries:
  ```typescript
  import { pool } from '../db/pool.js';
  const result = await pool.query('SELECT * FROM my_table WHERE id = $1', [id]);
  ```
