# Amanat — Committee Management

**Tagline:** *Har Committee Ka Bharosa*

A full-stack web application for **rotating savings committees** (*committees*): organizers create groups, members join rosters, admins run **monthly rounds**, and everyone tracks **payments** and **payout proof** using **transaction IDs** (money moves outside the app). The platform surfaces **trust scores**, **badges**, and **feedback** so participation stays transparent.

---

## Demo & live app

| | |
|---|---|
| **Screen recording** | [Amanat demo (Google Drive)](https://drive.google.com/file/d/1rdWn9vGwFmbTsNmIwrz-6PympAlvwgLY/view?usp=sharing) |
| **Deployed frontend** | [https://committee-management-aoj1.vercel.app/](https://committee-management-aoj1.vercel.app/) |

Only the **Angular frontend** is deployed on Vercel. The **API is not hosted** yet, so login and data calls need a **local backend** (see [Local setup](#local-setup)) unless you later point `NG_APP_API_URL` at a deployed API.

---

## Author & credentials (academic)

| | |
|---|---|
| **Student** | Rabia Ashfaq |
| **Program** | BS Software Engineering (e.g. FA23-BSE-074-5B — adjust if your roll differs) |
| **Repository** | `committee-management` |

Use this block in reports or Viva documentation as needed.

---

## Demo accounts (after `npm run seed`)

All seeded users share the same password. Use these to explore **admin** vs **member** flows.

| Role | Email | Password |
|------|--------|----------|
| **Admin (organizer)** | `rabia@amanat.demo` | `Test1234!` |
| Member | `sara@amanat.demo` | `Test1234!` |
| Member | `bilal@amanat.demo` | `Test1234!` |
| Member | `zara@amanat.demo` | `Test1234!` |
| Member | `usman@amanat.demo` | `Test1234!` |
| Member | `fatima@amanat.demo` | `Test1234!` |
| Member | `kamran@amanat.demo` | `Test1234!` |

Seeded data includes a sample committee (**Gulshan Committee**), members on the roster, rounds, payments, feedback, and badge examples. Re-running the seed wipes prior rows for emails ending in `@amanat.demo` / `@amanat-seed.demo` and recreates the demo dataset (see `backend/prisma/seed.ts`).

---

## Features

- **Authentication** — JWT-based login and registration (member vs admin roles).
- **Committees** — Create, search, filter by status; monthly pool and slot progress.
- **Rounds** — Start rounds, assign turns (manual / spin / bidding where applicable), payout transaction IDs, complete rounds.
- **Members** — Admin directory of member accounts; trust snapshot; history modal.
- **Trust profile** — Per-user trust score, earned badges, committee history, received feedback.
- **Dashboard** — Role-aware stats and recent activity.
- **Responsive UI** — Angular + Tailwind; mobile drawer navigation and touch-friendly controls.

---

## Tech stack

| Layer | Technology |
|--------|------------|
| **Frontend** | Angular 17, Tailwind CSS, Angular Material (tabs, buttons), Chart.js (where used), ngx-toastr |
| **Backend** | Node.js 18+, Express, Prisma ORM |
| **Database** | PostgreSQL (local, Supabase, Neon, etc.) |
| **Auth** | bcrypt password hashing, signed JWTs |

---

## Repository layout

```
committee-management/
├── frontend/          # Angular SPA (`ng serve` → http://localhost:4200)
├── backend/           # Express API (`npm run dev` → http://localhost:3000)
├── render.yaml        # Optional Render blueprint for the API
└── README.md
```

API routes are mounted under **`/api`** (e.g. `/api/auth/login`). Health check: **`GET /health`**.

---

## Prerequisites

- **Node.js** ≥ 18 (see `backend/package.json` / `frontend/package.json` for engine hints)
- **PostgreSQL** database and connection strings
- **npm** (or compatible client)

---

## Local setup

### 1. Database

Create a PostgreSQL database. For **Supabase** (or any pooler), you typically need:

- **`DATABASE_URL`** — pooled connection (often with `?pgbouncer=true`)
- **`DIRECT_URL`** — direct connection for Prisma migrations / introspection

See [Prisma + Supabase](https://www.prisma.io/docs/guides/database/supabase) for details.

### 2. Backend

```bash
cd backend
cp .env.example .env   # then edit with your URLs and secrets
```

Minimum variables:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="use-a-long-random-string-in-production"
PORT=3000
```

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

- API base: `http://localhost:3000/api`
- Health: `http://localhost:3000/health`

**Optional demo data:**

```bash
npm run seed
```

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

Open **`http://localhost:4200`**. By default the app targets **`http://localhost:3000/api`** (see `frontend/src/environments/environment.ts`).

---

## Environment variables (reference)

| Variable | Where | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | Backend | Prisma / PostgreSQL (pooled URL if using PgBouncer) |
| `DIRECT_URL` | Backend | Direct Postgres URL for Prisma |
| `JWT_SECRET` | Backend | Signing key for access tokens |
| `JWT_EXPIRES_IN` | Backend | Optional token lifetime (default in code if unset) |
| `PORT` | Backend | HTTP port (default `3000`) |
| `NG_APP_API_URL` | Frontend build (e.g. Vercel) | Public API base including **`/api`** |

---

## Deployment (summary)

You need **two** deployed artifacts in production: the **API** and the **static frontend**.

| Approach | API | Frontend |
|----------|-----|----------|
| **A** | Vercel (root `backend/`) | Vercel (root `frontend/`, set `NG_APP_API_URL`) |
| **B** | [Render](https://render.com) — see `render.yaml` (`plan: free`, `rootDir: backend`) | Vercel / Netlify / Cloudflare Pages |

**Backend (example — Render):**

1. New Web Service → connect repo, **Root Directory:** `backend`
2. **Build:** `npm install && npx prisma generate && npm run build`
3. **Start:** `node dist/index.js`
4. Set `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NODE_ENV=production`
5. After first deploy, run **`npx prisma db push`** (or migrations) against production DB from your machine, CI, or host shell

**Frontend (example — Vercel):**

1. New project → **Root Directory:** `frontend`
2. Set **`NG_APP_API_URL`** to `https://<your-api-host>/api`
3. Build uses `npm run build:vercel` per `vercel.json` / scripts

SPA deep links rely on host rewrites (e.g. Vercel `rewrites` to `index.html`).

---

## Useful commands

| Task | Command |
|------|---------|
| Backend (dev) | `cd backend && npm run dev` |
| Frontend (dev) | `cd frontend && npm start` |
| Sync schema (dev) | `cd backend && npx prisma db push` |
| Seed demo users | `cd backend && npm run seed` |
| Production frontend build | `cd frontend && npm run build:vercel` (with `NG_APP_API_URL` set) |

---

## Production checklist

- [ ] Strong, unique `JWT_SECRET`
- [ ] Production PostgreSQL reachable from API
- [ ] `prisma db push` or `prisma migrate deploy` applied on production
- [ ] Frontend `NG_APP_API_URL` points to live API **including** `/api`
- [ ] Smoke test: login → committees → rounds → profile

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| **`NG_APP_API_URL` missing** (Vercel build) | Add env var and redeploy; see `frontend/scripts/inject-env.cjs` |
| **Prisma `EPERM` on Windows** | Close apps locking `query_engine`; retry `npx prisma generate`; or `npx prisma generate --no-engine` as a workaround |
| **Login fails after seed** | Use emails **`@amanat.demo`** and password **`Test1234!`** (not older `@committee-seed.demo` docs) |
| **CORS / network errors** | Confirm browser calls your deployed API URL, not `localhost` |

---

## License

Use and modify for coursework or institutional requirements as permitted by your university.
