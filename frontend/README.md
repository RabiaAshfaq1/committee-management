# Frontend (Angular)

## Local development

```bash
npm install
npm start
```

App runs at `http://localhost:4200` and uses `src/environments/environment.ts` (`apiUrl: http://localhost:3000/api`).

## Production build (Vercel)

The hosted UI needs your **public API base URL**. From this folder:

```bash
# Windows PowerShell
$env:NG_APP_API_URL="https://your-api.example.com/api"; npm run build:vercel
```

On **Vercel**, set `NG_APP_API_URL` under Project → Settings → Environment Variables and use **Root Directory** = `frontend`.

Full deployment steps and backend hosting: see the **[root README](../README.md)**.
