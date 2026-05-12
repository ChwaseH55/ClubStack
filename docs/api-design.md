# API design

All endpoints are prefixed `/api`. Org-scoped endpoints require a valid JWT
and verified active membership in the org.

## Auth
- `POST /auth/register` — create user account
- `POST /auth/login` — returns JWT
- `POST /users/me/password` — change password

## User profile
- `GET /users/me` — own profile
- `PATCH /users/me` — update name, avatarUrl

## Organizations
- `POST /orgs` — create org (requires auth; creator becomes owner)
- `GET /orgs/:orgId` — org details + enabledFeatures + branding
- `PATCH /orgs/:orgId` — update branding/settings (owner/admin)
- `DELETE /orgs/:orgId` — delete org (owner only)

## Features
- `GET /orgs/:orgId/features` — list feature configs
- `PUT /orgs/:orgId/features` — replace enabledFeatures array (owner/admin)
- `PATCH /orgs/:orgId/features/:featureKey` — update per-feature settings (owner/admin)

## Dashboard
- `GET /orgs/:orgId/dashboard/summary` — single round-trip returning preview data
  for all enabled features (last 3 announcements, next 3 events, recent forum posts,
  latest chat message + unread count, shop items + dues status)

## Members
- `POST /orgs/:orgId/invites` — generate invite link (owner/admin)
- `POST /orgs/:orgId/join` — join via invite token
- `GET /orgs/:orgId/members` — list members (owner/admin)
- `GET /orgs/:orgId/members/:userId` — member profile (owner/admin)
- `PATCH /orgs/:orgId/members/:userId` — update role/status (owner/admin)
- `DELETE /orgs/:orgId/members/:userId` — remove member (owner/admin)

## Announcements
- `GET /orgs/:orgId/announcements` — list (all members)
- `POST /orgs/:orgId/announcements` — create (owner/admin)
- `PATCH /orgs/:orgId/announcements/:id` — edit (owner/admin)
- `DELETE /orgs/:orgId/announcements/:id` — delete (owner/admin)

## Events
- `GET /orgs/:orgId/events` — upcoming events (all members)
- `POST /orgs/:orgId/events` — create (owner/admin)
- `PATCH /orgs/:orgId/events/:id` — edit (owner/admin)
- `DELETE /orgs/:orgId/events/:id` — delete (owner/admin)
- `POST /orgs/:orgId/events/:id/register` — register for event (member)

## Forum
- `GET /orgs/:orgId/forum/posts` — list posts
- `POST /orgs/:orgId/forum/posts` — create post
- `GET /orgs/:orgId/forum/posts/:id` — post + comments
- `POST /orgs/:orgId/forum/posts/:id/comments` — add comment
- `DELETE /orgs/:orgId/forum/posts/:id` — delete post (owner/admin or own post)
- `DELETE /orgs/:orgId/forum/comments/:id` — delete comment (owner/admin or own)

## Chat
- `GET /orgs/:orgId/chat/rooms` — list rooms
- `GET /orgs/:orgId/chat/rooms/:roomId/messages` — message history (paginated)
- `POST /orgs/:orgId/chat/rooms/:roomId/messages` — send message (REST fallback; prefer Socket.io)
- `DELETE /orgs/:orgId/chat/messages/:id` — delete (owner/admin)

## Shop & Dues
- `GET /orgs/:orgId/shop/items` — list active items
- `POST /orgs/:orgId/shop/items` — create item (owner/admin)
- `PATCH /orgs/:orgId/shop/items/:id` — update item (owner/admin)
- `GET /orgs/:orgId/orders` — order history (own; all for owner/admin)
- `POST /orgs/:orgId/shop/checkout` — place order
- `GET /orgs/:orgId/dues/plans` — list dues plans
- `POST /orgs/:orgId/dues/checkout` — pay dues
