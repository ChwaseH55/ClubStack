# Events Expansion

## Vision

Transform events from timestamped announcements with RSVPs into structured activity records that produce queryable data about what members actually *did*. The goal is to give admins a real picture of member contribution — not just who clicked "Going", but who competed, who volunteered, and what their results were.

---

## What the current event already handles well

- Title, description, start/end time, capacity
- Going/Maybe/Can't go RSVPs with counts
- Attached polls
- Comments with threading and likes
- Post-as-announcement toggle

These stay as-is. Everything below is additive.

---

## Universal additions (all event types)

These apply to every event regardless of type:

### Location field
- Optional free-text `location` column on the `events` table
- Displayed on EventDetail and EventCard
- Included in calendar export

### Calendar export
Client-side only — no backend needed:
- **"Add to Google Calendar"** — deep link to `calendar.google.com/calendar/render` with title, dates, description, and location pre-filled
- **"Download .ics"** — generates an RFC 5545 iCalendar file the user can import into any calendar app (Apple Calendar, Outlook, etc.)
- Both available as buttons on EventDetail

---

## Event types

A new `event_type` enum column on `events` with a default of `'general'`. A `type_metadata jsonb` column stores type-specific configuration fields that are descriptive but not aggregated (e.g., tournament format name, volunteer organization name). Structured activity records that need to be queried go in their own tables.

### `general` (default)
No changes to current behavior. Any event that doesn't fit another type.

---

### `tournament`

**What makes it distinct:** A participant record with a result. Without result data, it's just an RSVP. With it, you get a competitive history per member and cross-event rankings.

**Additional config (`type_metadata`):**
- `format` — e.g., "Single Elimination", "Double Elimination", "Round Robin", "Swiss"
- `game_or_sport` — free text
- `registration_deadline` — timestamptz (can differ from event start)
- `team_size` — integer (1 = individual, >1 = team-based)
- `prize_description` — free text (optional)

**New table: `tournament_participants`**
```
id           uuid pk
event_id     uuid → events(id) on delete cascade
user_id      uuid → profiles(id) on delete cascade
seed         integer (nullable — assigned by admin before event)
placement    integer (nullable — filled in after event)
result_note  text   (nullable — e.g., "Won 3-1", "Forfeited R2")
registered_at timestamptz default now()
unique (event_id, user_id)
```

**Member flow:**
- EventDetail shows a "Register for tournament" button (distinct from RSVP)
- Registration creates a `tournament_participants` row
- Admin can set seeds before the event and enter placements after

**Admin flow:**
- Participant list on EventDetail (with seed/placement columns)
- Inline edit for seed and placement after the event

---

### `volunteer`

**What makes it distinct:** Verified hours. An unverified RSVP is not a volunteer record. An admin-approved check-in with actual start/end times is.

**Additional config (`type_metadata`):**
- `organization` — name of the org/cause being served (free text)
- `hours_goal` — target hours per volunteer (informational)
- `supervisor_name` / `supervisor_contact` — free text (optional)
- `dress_code` / `bring` — free text notes (optional)

**New table: `volunteer_checkins`**
```
id              uuid pk
event_id        uuid → events(id) on delete cascade
user_id         uuid → profiles(id) on delete cascade
checked_in_at   timestamptz (nullable — self-reported or admin-entered)
checked_out_at  timestamptz (nullable)
hours_override  numeric(4,2) (nullable — admin can set a flat hour count)
approved        boolean default false
approved_by     uuid → profiles(id) (nullable)
notes           text (nullable)
unique (event_id, user_id)

-- computed: coalesce(hours_override, extract(epoch from (checked_out_at - checked_in_at)) / 3600)
```

**Member flow:**
- "I'm volunteering" button on EventDetail creates a checkin row
- After the event, members can see their logged hours

**Admin flow:**
- Checkin table on EventDetail: list of volunteers, check-in/out times, hour totals
- Approve button per row (or bulk approve)
- Override hours field for edge cases

---

## Analytics expansion

The structured data from the above tables unlocks a new "Activity" section in the admin analytics dashboard.

### New analytics panels

**Participation overview**
- Events attended (RSVPs where status = 'going') per member over rolling 30/90 days
- Attendance rate = attended / total events in period

**Tournament performance** (only when org has tournament events)
- Per-member: events entered, average placement, best placement
- Leaderboard sortable by placement or entries

**Volunteer hours** (only when org has volunteer events)
- Per-member: total approved hours, events participated in
- Leaderboard sortable by hours
- Hours trend over time (monthly bar chart)

**Most active members overall**
- Composite score: events + forum posts + comments (weighted, configurable later)
- Useful for recognizing contributors

---

## Data model summary

```
events (existing)
  + event_type     text not null default 'general'  -- 'general' | 'tournament' | 'volunteer'
  + location       text
  + type_metadata  jsonb default '{}'

tournament_participants (new)
  id, event_id, user_id, seed, placement, result_note, registered_at

volunteer_checkins (new)
  id, event_id, user_id, checked_in_at, checked_out_at, hours_override, approved, approved_by, notes
```

No changes to the existing `event_rsvps` table — RSVPs remain independent of tournament registration and volunteer sign-up.

---

## Phased implementation plan

### Phase 1 — Universal additions
**Scope:** Location field, calendar export, event type selector in EventForm (UI only — no type-specific behavior yet), type badge on EventCard/EventDetail.

**DB change:** Add `location`, `event_type`, `type_metadata` to `events`.

**Deliverables:**
- Location field in EventForm, shown on EventDetail and EventCard
- "Add to Google Calendar" + "Download .ics" buttons on EventDetail
- Event type pill/badge (General / Tournament / Volunteer) visible everywhere
- EventForm shows type selector — choosing Tournament or Volunteer shows their metadata fields (`format`, `organization`, etc.) in the form

**Estimated scope:** Small. Mostly UI, one migration.

---

### Phase 2 — Tournament events
**Scope:** Registration, participant list, seed/placement entry.

**DB change:** Create `tournament_participants` table.

**Deliverables:**
- "Register" button on tournament EventDetail (replaces/supplements RSVP)
- Participant list section showing registered members + seed
- Admin: inline seed assignment before event, placement entry after
- Registration deadline enforcement (button hidden/disabled after deadline)

**Estimated scope:** Medium. New table, new UI section on EventDetail.

---

### Phase 3 — Volunteer events
**Scope:** Volunteer sign-up, check-in tracking, admin hour approval.

**DB change:** Create `volunteer_checkins` table.

**Deliverables:**
- "I'm volunteering" button on volunteer EventDetail
- Admin checkin management panel: list, approve, override hours
- Member can see their own hours on EventDetail
- Volunteer hours shown on member profile (future)

**Estimated scope:** Medium. New table, new UI section, admin approval flow.

---

### Phase 4 — Analytics expansion
**Scope:** New panels on the admin Analytics dashboard using data from Phases 1–3.

**Deliverables:**
- Participation rate panel (uses event_rsvps)
- Tournament leaderboard panel (uses tournament_participants)
- Volunteer hours panel (uses volunteer_checkins)
- Most active members panel (uses rsvps + forum_comments + forum_posts)

**Estimated scope:** Medium. Read-only queries, new chart/table components. No new migrations needed if Phases 2–3 are done.

---

## Open questions / decisions needed

1. **Tournament registration vs RSVP** — Should registering for a tournament also count as an RSVP ("Going"), or are they kept fully separate? Keeping them separate is cleaner but means two clicks for the member.

2. **Volunteer check-in method** — Self-reported (member enters their own times) vs admin-only entry vs QR code scan at the event. Self-reported with admin approval is the simplest to build and still produces verified records.

3. **Team tournaments** — `team_size > 1` is in the metadata but team management (forming teams, assigning members to a team record) is a significant additional scope. Recommend deferring: Phase 2 builds individual participant records only, team support is a separate phase.

4. **Bracket visualization** — A bracket UI is highly visible but doesn't add new data. Recommend deferring until after placement data exists; at that point a bracket can be rendered from the data rather than driving data entry.

5. **Hours computation** — Whether to compute hours in SQL (generated column) or in JS. A generated column keeps analytics queries simple but can't be easily overridden. Recommend `hours_override` as the source of truth when set, otherwise compute in JS from check-in/check-out times.
