/**
 * Copy to environment.deploy.ts only for local testing of the Vercel build, or rely on
 * `npm run build:vercel` which generates environment.deploy.ts from NG_APP_API_URL.
 */
export const environment = {
  production: true,
  apiUrl: 'https://your-backend.example.com/api',
};
