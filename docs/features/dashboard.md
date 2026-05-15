# Feature spec: Dashboard

## Goal
Render a tailored, live dashboard based on the org's enabled feature modules.
Each enabled feature appears as a tile with a live data preview.
Disabled features are completely hidden — no empty placeholder tiles.

## Reference
Pattern adapted from GolfClubUCF's Home.js (top nav + module links + content area),
enhanced with a persistent sidebar, per-tile live previews, and org branding.

## Core user stories
- As an owner, I see a dashboard with only my org's enabled modules.
- As an admin, I can toggle features from Org Settings; dashboard updates immediately.
- As a member, I can access any enabled module from the sidebar nav.
- As any user, I see a meaningful empty state when a module has no content yet.

## Layout

```
┌──────────────────────────────────────────────────────┐
│ [Logo] Org Name                    [Search] [Avatar] │  ← TopBar (56px)
├───────────────┬──────────────────────────────────────┤
│               │                                      │
│   Sidebar     │   Module tile grid                   │
│   (240px)     │                                      │
│               │  ┌─────────────┐  ┌─────────────┐   │
│  ○ Home       │  │ Announce    │  │  Events     │   │
│  ○ Announce   │  │ · Item 1    │  │  · Event 1  │   │
│  ○ Events     │  │ · Item 2    │  │  · Event 2  │   │
│  ○ Forum      │  │ · Item 3    │  │  · Event 3  │   │
│  ○ Chat       │  │ [View all]  │  │  [Calendar] │   │
│  ○ Shop       │  └─────────────┘  └─────────────┘   │
│               │  ┌─────────────┐  ┌─────────────┐   │
│               │  │  Forum      │  │  Chat       │   │
│               │  │ · Post 1    │  │  # general  │   │
│               │  │ · Post 2    │  │  [Open]     │   │
│               │  │ [Browse]    │  └─────────────┘   │
│               │  └─────────────┘  ┌─────────────┐   │
│               │                   │  Shop       │   │
│               │                   │  Dues: Paid  │   │
│               │                   │  [Go shop]  │   │
│               │                   └─────────────┘   │
└───────────────┴──────────────────────────────────────┘
```

## Module tile specs

### Announcements tile
- Shows latest 3 announcements: title + relative date
- “View all announcements” → `/announcements`
- Empty state: “No announcements yet. Admins can post updates here.”

### Events tile
- Shows next 3 upcoming events: title + date + location snippet
- “View calendar” → `/calendar`
- Empty state: “No upcoming events. Check back soon.”

### Forum tile
- Shows 3 most recent posts: title + author name + reply count
- “Browse forum” → `/forum`
- Empty state: “No posts yet. Be the first to start a discussion.”

### Chat tile
- Shows default room name + last message preview + unread count badge
- “Open chat” → `/chat`
- Realtime unread badge updated via Socket.io

### Shop tile
- Dues status badge: Paid / Unpaid / N/A (when Shop feature is enabled but no dues plan set)
- Up to 3 featured active items: name + price
- “Go to shop” → `/shop`
- Empty state: “No items available yet.”

## Sidebar behavior
- Fixed 240px on desktop; highlights active route
- Tablet (md): icon-only strip (64px) with tooltips on hover
- Mobile: hidden by default; hamburger opens slide-in overlay
- Renders nav items only for keys in `org.enabledFeatures`
- Org logo + name at top; logout button at bottom

## TopBar
- Left: org name
- Right: user avatar with dropdown (Profile, Org Settings, Logout)
- Background uses org primary color

## Scope (MVP)
- Sidebar + TopBar shell
- Module tile grid driven by `enabledFeatures`
- Live preview data fetched from `/dashboard/summary`
- Org branding: logo in sidebar, primary color on sidebar/topbar via CSS var
- Empty states per tile

## API
- `GET /orgs/:orgId` — org info, branding, enabledFeatures
- `GET /orgs/:orgId/dashboard/summary` — aggregated preview for all enabled features:
  ```json
  {
    "announcements": [{ "title": "...", "createdAt": "..." }],
    "events": [{ "title": "...", "startAt": "...", "location": "..." }],
    "forum": [{ "title": "...", "author": "...", "commentCount": 0 }],
    "chat": { "roomName": "general", "lastMessage": "...", "unreadCount": 3 },
    "shop": { "duesStatus": "paid", "items": [{ "name": "...", "price": 0 }] }
  }
  ```

## TDD checklist
- Tiles only render for keys present in `enabledFeatures`
- Toggling a feature off removes its tile without page reload
- Sidebar nav items match `enabledFeatures`
- Org branding applied from org data (logo, primary color)
- Empty state shown when a module has no content
- `/dashboard/summary` is org-scoped (no cross-org data)
- Non-members redirected to login
