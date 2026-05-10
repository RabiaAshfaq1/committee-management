# Committee Management

A small **rotating savings committee** app: **Angular** frontend, **Node (Express) + Prisma + PostgreSQL** backend. Organizers run committees and monthly rounds; members join rosters; payouts are tracked with a **transaction ID** only (no in-app payment ledger).

---

## What’s in this repo

| Part | Stack | Role |
|------|--------|------|
| `frontend/` | Angular 17 | Web UI |
| `backend/` | Express, Prisma, JWT | REST API (`/api/...`) |

---

## How to run locally

### 1. Database

Create a **PostgreSQL** database (local Docker, Supabase, Neon, etc.). You need:

- `DATABASE_URL` — connection string (often with `?pgbouncer=true` for poolers)
- `DIRECT_URL` — direct Postgres URL for Prisma migrations (see [Prisma + Supabase](https://www.prisma.io/docs/guides/database/supabase))

### 2. Backend

```bash
cd backend
cp .env.example .env   # if you maintain one; otherwise create .env
```

**`.env` (minimum):**

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="long-random-string"
PORT=3000
```

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

API base: `http://localhost:3000/api`  
Health: `http://localhost:3000/health`

**Demo data (optional):**

```bash
npm run seed
```

Uses emails ending in `@committee-seed.demo` and password `SeedDemo123!` (see `backend/prisma/seed.ts`).

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:4200`. The dev app calls `http://localhost:3000/api` (`environment.ts`).

---

## Deploy overview

You need two public URLs in production: **API** + **static Angular app**. They can both live on **Vercel** (two separate projects from the same Git repo), or you can host the API on **Render / Railway** instead.

---

## Option A — Both on Vercel (two projects, same repo)

Use **two Vercel projects**: one for `backend`, one for `frontend`. Deploy the **API first**, copy its URL, then set the frontend env var.

### 1) Backend (API) project

1. Vercel → **Add New Project** → your Git repo.  
2. **Root Directory:** `backend`  
3. **Environment variables** (Production):

   | Name | Value |
   |------|--------|
   | `DATABASE_URL` | PostgreSQL connection string |
   | `DIRECT_URL` | Same DB direct URL (needed for Prisma with poolers e.g. Supabase) |
   | `JWT_SECRET` | Long random string |

4. **Deploy.**  
5. After deploy, open **`https://YOUR-BACKEND.vercel.app/health`** — you should see `{"status":"ok",...}`.  
6. Apply the database schema to your **production** DB (from your PC with prod `DATABASE_URL`, or Vercel CLI / one-off job):

   ```bash
   cd backend
   npx prisma db push
   ```

**Notes:** On Vercel, Express is served from `backend/src/index.ts` (default export) per [Vercel’s Express guide](https://vercel.com/guides/using-express-with-vercel). Prisma includes a Linux engine for serverless. Clear **Output Directory** in the Vercel project if you set one by mistake. Cold starts can add latency on the first request.

### 2) Frontend project

1. **Add New Project** again → **same repo** (second project).  
2. **Root Directory:** `frontend`  
3. **Environment variable:**

   | Name | Value |
   |------|--------|
   | `NG_APP_API_URL` | `https://YOUR-BACKEND.vercel.app/api` |

   Use the **exact** backend URL Vercel gave you, with **`/api`** at the end.

4. Deploy. Open the **frontend** URL and test login.

---

## Option B — Backend on Render (or Railway), frontend on Vercel

Same as before for the frontend. For the API, use Render/Railway with **Root Directory `backend`**, `node dist/index.js`, and `NG_APP_API_URL` pointing to that host (`.../api`).

---

## Deploy frontend on Vercel (manual checklist)

1. Push this repository to GitHub (or GitLab / Bitbucket).
2. In [Vercel](https://vercel.com) → **Add New Project** → import the repo.
3. **Root Directory:** set to `frontend`.
4. Framework preset may show “Other” — that is fine; `vercel.json` sets build/output.
5. **Environment variables** (Production / Preview as needed):

   | Name | Example value |
   |------|----------------|
   | `NG_APP_API_URL` | `https://your-api-host.com/api` |

   Use the **full API base** including `/api`. If you omit `/api`, the build script appends it.

6. **Deploy.**  
   Build runs: `npm run build:vercel` → generates `environment.deploy.ts` → `ng build --configuration=vercel` → output in `dist/frontend/browser`.

7. Open your Vercel URL and sign in. If login fails, check the browser network tab: requests should go to your **backend** URL, not localhost.

**SPA routing:** `vercel.json` rewrites unknown paths to `index.html` so deep links (e.g. `/dashboard`) work.

---

## Deploy backend (example: Render)

1. Create a **Web Service**; connect the same repo.
2. **Root Directory:** `backend`
3. **Build command:** `npm install && npx prisma generate && npm run build`
4. **Start command:** `node dist/index.js`
5. Set **environment variables:** `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NODE_ENV=production`
6. After the first deploy, apply the schema:

   ```bash
   npx prisma db push
   ```

   (Run from your machine with production `DATABASE_URL`, or use Render shell / one-off job.)

Optional: `render.yaml` in the repo root is a starter **Render Blueprint** for the API (adjust names/plan as needed).

---

## Production checklist

- [ ] Strong `JWT_SECRET` on the API
- [ ] PostgreSQL reachable from the API host
- [ ] `prisma db push` (or migrations) applied on production DB
- [ ] `NG_APP_API_URL` matches the real API **including** `/api`
- [ ] Smoke test: register / login, create committee, open rounds

---

## Useful commands

| Task | Command |
|------|---------|
| Backend dev | `cd backend && npm run dev` |
| Frontend dev | `cd frontend && npm start` |
| DB sync (dev) | `cd backend && npx prisma db push` |
| Seed demo users | `cd backend && npm run seed` |
| Production frontend build (CI) | `cd frontend && set NG_APP_API_URL=... && npm run build:vercel` |

---

## Troubleshooting

- **`NG_APP_API_URL` missing on Vercel** — build fails with a message from `scripts/inject-env.cjs`. Add the variable and redeploy.
- **Old DB with `SUPER_ADMIN` / `Payment` table** — see `backend/prisma/fix-super-admin.sql` and project history; run `prisma db push` after fixing data.
- **Prisma `EPERM` on Windows** — close processes locking `query_engine`, or run generate/push again.

---

## License

Use and modify for your course or project as required by your institution.
