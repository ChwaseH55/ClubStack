# Tech Stack

## Frontend
- **React 18** — component model, hooks
- **Vite** — dev server and bundler
- **Tailwind CSS** — utility-first CSS; org branding via `--org-primary` CSS custom property
- **React Router v6** — client-side routing
- **React Context + useReducer** — auth and org state

## Backend — Supabase
No custom API server. The React client talks directly to Supabase via `@supabase/supabase-js`.

| Supabase service | What it replaces |
|---|---|
| Postgres | database |
| Auth | hand-rolled JWT + bcrypt |
| Storage | S3 + Multer setup |
| Realtime (Broadcast + Presence) | Socket.io |
| Edge Functions | Express server for webhooks/custom logic |

**Row Level Security** enforces multi-tenant isolation at the database level.
Two helper functions (`is_member`, `is_admin`) keep policy definitions readable.

## Additional services
- **Stripe** — payments and dues (via Edge Function webhook)
- **Resend** — transactional email (event reminders, invite links)
- **Sentry** — error tracking
- **Mux or Cloudinary** — video hosting if video becomes a feature

## Infrastructure
- **Frontend**: Vercel (free tier)
- **Backend**: Supabase (free tier → $25/month Pro)
- **Migrations**: Supabase CLI — `supabase db push` applies versioned SQL files
- **Local dev**: `supabase start` runs a full local Supabase stack via Docker
- **Type generation**: `supabase gen types typescript` keeps DB types in sync with schema

## Scaling path
Supabase free → Pro ($25/month) → Team ($599/month) → self-hosted on your own infra.
Since Supabase is open source and the database is standard Postgres, migrating off
is possible without a full rewrite if needed.
