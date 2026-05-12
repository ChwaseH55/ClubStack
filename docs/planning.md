# Planning

This document captures decisions made pre-implementation. All open questions from the initial draft are resolved below.

## Product scope and MVP boundaries
- MVP feature modules: Announcements, Calendar & Events, Forum, Chat, Shop/Dues
- Features can be toggled on/off after org creation by owner/admin
- Dashboard = left sidebar nav + top bar + responsive grid of module tiles
- Each tile shows a live preview of recent content (last 3 announcements, next 3 events, etc.)
- Member profile page tracks dues status, membership role, and join date

## User flows

### Org owner sign-up and org creation
1. Register account (email + password)
2. Create org: name, slug, upload logo, pick primary color
3. Select initial features (can change later from Org Settings)
4. Redirect to generated dashboard

### Feature selection and configuration
- Owner/admin visits Org Settings → Features tab
- Toggle each feature on/off
- Dashboard tiles appear/disappear without page reload

### Member invite/join
- Owner/admin generates an invite link (org-scoped, expires in 7 days)
- Invitee clicks link → registers or logs in → becomes active member
- Alternatively, members request to join via org slug page; admin approves

### Role changes
- Owner can promote members to admin or demote admins to member
- Owner role is non-transferable without explicit org transfer flow (post-MVP)

## Data model decisions
- Multi-tenant via `orgId` column on every data table
- `Organization.enabledFeatures` is a string array of feature keys
- Per-feature settings stored in `FeatureConfiguration` (JSON blob keyed by featureKey)
- No cross-org joins; all queries filter by orgId

## Permissions and roles

| Action                  | Owner | Admin | Member |
|-------------------------|-------|-------|--------|
| Create/delete org       | ✓     |       |        |
| Toggle features         | ✓     | ✓     |        |
| Manage members/roles    | ✓     | ✓     |        |
| Create announcements    | ✓     | ✓     |        |
| Create events           | ✓     | ✓     |        |
| Moderate forum/chat     | ✓     | ✓     |        |
| View dashboard          | ✓     | ✓     | ✓      |
| Post in forum/chat      | ✓     | ✓     | ✓      |
| Purchase from shop      | ✓     | ✓     | ✓      |

## UI/UX expectations
- Layout: fixed left sidebar (240px) + top bar (56px) + scrollable main content
- Sidebar collapses to icon-only strip on md screens; bottom tab bar on mobile
- Dashboard main: responsive tile grid — 1 col mobile, 2 col tablet, 3 col desktop
- Tile anatomy: icon + feature name + preview list (3 items) + "view all" CTA
- Empty state per tile: friendly prompt with action (e.g. "Post your first announcement")
- Org branding: primary color applied to sidebar background; logo in sidebar header
- Light mode first for MVP

## Technical choices
- **Frontend**: React 18, React Router v6, Tailwind CSS
- **State**: React Context + useReducer (no external state library for MVP)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (pg driver, raw SQL)
- **Auth**: JWT (7-day expiry) + bcrypt (cost 12)
- **Realtime**: Socket.io for chat
- **File uploads**: Multer + S3-compatible storage for logos and shop images

## Testing strategy
- Unit/component: Jest + React Testing Library
- API: Supertest + Jest
- E2E: Playwright (Phase 2)
- Each feature has a TDD checklist in `docs/features/`

## Non-functional requirements
- All DB queries must include orgId filter (no cross-org data leakage)
- Passwords hashed with bcrypt; never logged
- JWT signed with HS256; secret injected via env var
- Mobile-first responsive design (min supported: 375px wide)
