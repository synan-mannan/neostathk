# NeoStats Collaborative Project Management Platform

A robust, real-time, multi-user project management platform built for the NeoStats Full Stack Engineering Hackathon.

---

## 1. Implemented Features & Architecture

### A. Authentication & Server-Authoritative Roles
- **Stateful JWT session stored in HttpOnly cookies** (`SameSite: lax`, `Secure` in prod) with optional Bearer token fallback.
- **Bcrypt password hashing** (salt rounds = 10).
- **Four Global Roles**:
  - `ADMIN`: User management (create, update, deactivate), project creation/deletion, system audit logs.
  - `PROJECT_MANAGER`: Full management of assigned projects, member role updates, task assignments and CRUD.
  - `TEAM_MEMBER`: Access to assigned projects and tasks, ability to update task status and post comments.
  - `VIEWER`: Read-only access to authorized projects, task boards, and activities.
- **Project-Level Role Hierarchy**: `MANAGER > MEMBER > VIEWER` checked dynamically on every project-scoped API request.
- Centralized server-side authorization layer (`requireGlobalRoles`, `requireProjectRole`). Frontend never controls authorization alone.

### B. Core Database Design (PostgreSQL)
Applied with clean normalized relational tables in [`backend/src/db/schema.sql`](file:///c:/Users/syedm/Practice/neostats_hackathon/backend/src/db/schema.sql):
1. `users`
2. `projects`
3. `project_members` (composite unique key on `(project_id, user_id)`)
4. `tasks` (includes `version INT NOT NULL DEFAULT 1`)
5. `comments`
6. `notifications`
7. `activity_logs` (stores context in `metadata JSONB`)

### C. Concurrency Control (MANDATORY Optimistic Locking)
- Atomic SQL queries check and increment `version` on task mutations:
  ```sql
  UPDATE tasks
  SET title = $1, status = $2, version = version + 1, updated_at = NOW()
  WHERE id = $3 AND version = $4
  RETURNING *;
  ```
- If a stale version is detected, the server returns **`HTTP 409 Conflict`** with current database values.
- The Next.js frontend catches `409 Conflict`, renders a conflict modal detailing what changed, and lets the user reload the latest version before retrying.

### D. Real-Time Collaboration (Socket.IO)
- Socket connections authenticate via incoming HttpOnly cookie or handshake tokens.
- **Project-scoped rooms**: `project:<projectId>` with server authorization before admitting sockets to rooms.
- **Personal rooms**: `user:<userId>` for private notifications.
- **Live events**:
  - `task:created`
  - `task:updated`
  - `task:status_changed`
  - `task:assigned`
  - `task:deleted`
  - `comment:created`
  - `comment:deleted`
  - `project:member_added`
  - `project:member_updated`
  - `project:member_removed`
  - `notification:created`
  - `activity:created`

### E. Frontend Pages (Next.js App Router + Tailwind CSS)
- `/login`: Clean login form with 1-click test account autofill buttons.
- `/dashboard`: Project list, assigned task counts, unread notification counter, and live activity stream.
- `/projects`: Project list with search, status filter, and Admin-only project creation.
- `/projects/[id]`: Project details, member count, and task status breakdown metrics.
- `/projects/[id]/tasks`: Interactive task board with filtering, real-time sync, OCC version indicators, and conflict handling.
- `/projects/[id]/team`: Member list, role selector (`MANAGER`, `MEMBER`, `VIEWER`), and add/remove controls.
- `/projects/[id]/activity`: Real-time project audit log.
- `/tasks/[id]`: Task details, version history, atomic updates, and comment thread.
- `/users`: Admin-only user management (create user, change global role, deactivate).
- `/notifications`: Live notification feed with mark-as-read and mark-all-as-read.
- `/profile`: Current user details and sign out.

---

## 2. Demo Accounts (Local Development)

All demo accounts use the default password: **`Password123!`**

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@neostats.com` | `Password123!` | System-wide full access, manage users, create/delete projects |
| **Project Manager** | `manager@neostats.com` | `Password123!` | Manages Project Apollo, assigns tasks, adds/removes team members |
| **Team Member** | `member@neostats.com` | `Password123!` | Belongs to Project Apollo, updates assigned tasks, adds comments |
| **Viewer** | `viewer@neostats.com` | `Password123!` | Read-only view on Project Apollo |

---

## 3. Database Setup & Seed Commands

### Step 1: Initialize Database & Seed Demo Data
The seed script applies [`schema.sql`](file:///c:/Users/syedm/Practice/neostats_hackathon/backend/src/db/schema.sql) and inserts the demo users, projects, tasks, comments, and notifications:

```bash
cd backend
npm run seed
```

*(Or from workspace root: `npm run seed --prefix backend`)*

---

## 4. Starting Frontend and Backend

Run each service in separate terminals:

### Terminal 1: Backend API & Socket.IO (Port 4000)
```bash
cd backend
npm run dev
```

### Terminal 2: Next.js Frontend (Port 3000)
```bash
cd frontend
npm run dev
```

Navigate to `http://localhost:3000` to use the application.

---

## 5. Verification & Tests

To run the automated backend test suite verifying database schema, user roles, and optimistic concurrency control (HTTP 409):

```bash
cd backend
node --import tsx src/test-verify.ts
```

To verify production compilation:
```bash
# Backend compilation
cd backend && npm run build

# Frontend compilation
cd frontend && npm run build
```
Both compile with **0 errors**.
