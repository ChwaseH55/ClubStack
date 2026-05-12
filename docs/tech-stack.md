# Tech Stack

Decisions finalized based on GolfClubUCF reference implementation and ClubStack's multi-tenant SaaS requirements.

## Frontend
- **React 18** — component model, hooks, Suspense for async data
- **React Router v6** — client-side routing; nested routes per feature module
- **Tailwind CSS** — utility-first CSS; org branding via CSS custom properties (`--org-primary`)
- **React Context + useReducer** — auth state and org context; no Redux for MVP
- **Vite** — dev server and bundler (replaces CRA)

## Backend
- **Node.js + Express** — REST API server
- **PostgreSQL** — relational DB; multi-tenant via `org_id` on all tables
- **pg** — native Postgres driver (raw SQL, no ORM)
- **bcrypt** — password hashing (cost factor 12)
- **jsonwebtoken** — JWT auth (HS256, 7-day expiry)
- **Socket.io** — realtime for chat feature

## Infrastructure (target)
- Frontend: Vercel or Netlify
- Backend + DB: Railway or Render
- File storage: Cloudflare R2 or AWS S3

## Dev tooling
- ESLint + Prettier
- dotenv for environment config
- nodemon for backend dev server

## Rationale
GolfClubUCF proved out the React + Tailwind + Express + Postgres stack for a single-org club app.
ClubStack extends that foundation with multi-tenancy (orgId isolation), feature toggling,
org branding via CSS custom properties, and Socket.io for realtime chat.
