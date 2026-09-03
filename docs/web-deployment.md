# Web deployment

- Canonical domain: `emroozapp.com`
- `www.emroozapp.com` should redirect to `emroozapp.com`
- HTTPS required
- Environment: set the values in `.env.example` in the deployment platform's secret store
- Redirect URLs for Supabase auth: `https://emroozapp.com/auth/callback`
- Public and private routes are separated in `src/app/robots.ts`

Do not deploy or change DNS without explicit authorization from the operator. The build itself is fully self-contained: `pnpm build:web` succeeds without any provider credentials (the app falls back to demo data at runtime).
