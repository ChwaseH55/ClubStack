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

A new `event_type` column on `events` defaulting to `'general'`. A `type_metadata jsonb` column stores type-specific configuration that is descriptive but not aggregated (tournament mode, volunteer org name, etc.). Structured activity records that need to be queried for analytics go in their own tables.

### `general` (default)
No changes to current behavior. Meetings, socials, practices — anything that doesn't need type-specific tracking.

---

### `tournament`

**What makes it distinct:** A participant record with a score or result. Without that data it's just an RSVP. With it you get a competitive history per member and cross-event rankings.

#### Tournament modes

Tournaments have a `tournament_mode` field (stored in `type_metadata`) that controls the scoring and display logic. Modes planned:

| Mode | Description | Status |
|------|-------------|--------|
| `leaderboard` | Numeric score per participant; lower-is-better (golf) or higher-is-better. Admin enters scores, system ranks automatically. | **Phase 2** |
| `bracket` | Single or double elimination. Head-to-head results, bracket visualization. | Future |
| `round_robin` | Everyone plays everyone; win/loss/draw record. | Future |

**Phase 2 builds `leaderboard` mode only**, which covers individual golf tournaments directly.

#### Leaderboard mode specifics

- Admin enters a single numeric score per participant after (or during) the event
- `score_label` in metadata describes what the number means (e.g., "Total Strokes", "Net Score", "Points")
- `lower_is_better` boolean in metadata controls sort direction (default `true` for golf)
- Ties are displayed at the same placement; the next placement is skipped (1, 1, 3...)
- Placement is computed in JS from the sorted score list — not stored, so it's always consistent with the scores

#### Additional config (`type_metadata` fields for tournament)

- `tournament_mode` — `'leaderboard'` | `'bracket'` | `'round_robin'`
- `score_label` — free text, e.g., "Total Strokes" (default: "Score")
- `lower_is_better` — boolean (default: true)
- `registration_deadline` — ISO timestamp, optional
- `prize_description` — free text, optional
- *(future) `game_or_sport`, `team_size` when team/bracket modes are added*

#### New table: `tournament_participants`

```
id             uuid pk
event_id       uuid → events(id) on delete cascade
user_id        uuid → profiles(id) on delete cascade
score          numeric(7,2)  nullable — entered by admin
result_note    text          nullable — e.g., "Withdrew", "DQ"
registered_at  timestamptz   default now()
unique (event_id, user_id)
```

No `placement` or `seed` column — placement is derived from score at query time, and seeding is not needed for leaderboard mode.

#### RSVP = registration (for now)

Registering for a tournament is the same action as RSVPing "Going". The existing RSVP creates a `tournament_participants` row automatically (or the participant section uses `event_rsvps` where `status = 'going'`). This can be decoupled later if registration deadlines or slot limits require it.

**Decision rationale:** Keeping them unified avoids asking members to click two separate buttons for the same intent. The separation becomes worth it only when tournament registration needs its own deadline or capacity independent of the event's general capacity, which is a future concern.

#### Member flow
- RSVP "Going" on a tournament event = registration
- After the event, they can see the leaderboard with scores and placements

#### Admin flow
- Score entry panel on EventDetail (post-event): list of participants, score input per row
- Leaderboard renders live as scores are entered
- Result note field for withdrawals or disqualifications

---

### `volunteer`

**What makes it distinct:** After a volunteer event ends, everyone who RSVP'd "Going" is credited with having volunteered. Hours are derived from the event's duration (end_at − start_at). No manual check-in or admin approval required.

**Rationale for this approach:** Consistent manual verification creates friction that outweighs its accuracy benefit in a trust-based club context. The event start/end times set the expected commitment upfront, and RSVP + event completion is a reasonable proxy for participation. Admins can correct outliers by editing RSVP records if needed.

**Volunteer credit logic:**
- A member has volunteer credit for an event when: `event.event_type = 'volunteer'` AND `event.end_at < now()` AND their RSVP `status = 'going'`
- Hours credited = `(end_at − start_at)` in decimal hours, rounded to one decimal place
- No new table needed — this is a read query against existing `events` and `event_rsvps` data

**Additional config (`type_metadata` fields for volunteer):**
- `organization` — name of org or cause being served (free text, optional)
- `what_to_bring` — free text notes shown on EventDetail (optional)
- `contact` — supervisor or coordinator name/contact (optional)

**Member view on EventDetail:**
- Shows organization name and any notes from `type_metadata`
- After event passes: shows their credited hours

**Admin view on Analytics:**
- Volunteer hours per member = sum of hours across all past volunteer events they RSVP'd "Going" to
- No approval workflow needed

---

## Analytics expansion

The structured data from the above tables unlocks a new "Activity" section in the admin analytics dashboard. These panels only appear when the org has the relevant data.

### New analytics panels

**Participation overview**
- Events attended (RSVPs where `status = 'going'`, event has passed) per member
- Attendance rate = events attended / total org events in period
- Filterable by event type

**Tournament leaderboard (org-wide)**
- Per-member across all tournament events: events entered, average placement, best placement
- For golf: average score, best score (lowest)
- Sortable by placement, score, or number of events

**Volunteer hours**
- Per-member: total credited hours, number of volunteer events
- Computed from `event_rsvps` + `events` — no dedicated table needed
- Monthly hours trend (bar chart)

**Most active members overall**
- Composite across: events attended + tournament entries + volunteer hours + forum posts + comments
- Useful for recognizing contributors, surfacing engaged members

---

## Data model summary

```
events (existing)
  + event_type     text not null default 'general'  -- 'general' | 'tournament' | 'volunteer'
  + location       text
  + type_metadata  jsonb not null default '{}'

tournament_participants (new — Phase 2)
  id, event_id, user_id, score, result_note, registered_at
  unique (event_id, user_id)

-- No new table for volunteer events.
-- Volunteer credit is derived from event_rsvps + events at query time.
```

---

## Phased implementation plan

### Phase 1 — Universal additions
**Scope:** Location field, calendar export, event type selector in EventForm, type badge on EventCard/EventDetail, volunteer metadata display.

**DB change:** Add `location`, `event_type`, `type_metadata` to `events`.

**Deliverables:**
- Location field in EventForm, shown on EventDetail and EventCard
- "Add to Google Calendar" + "Download .ics" buttons on EventDetail
- Event type badge (General / Tournament / Volunteer) on EventCard and EventDetail header
- EventForm: type selector that reveals type-specific metadata fields when Tournament or Volunteer is chosen
  - Tournament: mode selector (leaderboard only for now), score label, lower-is-better toggle, prize description
  - Volunteer: organization name, what to bring, contact
- Volunteer EventDetail: shows org/notes from metadata; shows credited hours to member after event passes

**Estimated scope:** Small–medium. One migration, EventForm additions, EventDetail/EventCard UI updates.

---

### Phase 2 — Tournament leaderboard mode
**Scope:** Participant tracking and score entry for leaderboard-mode tournaments.

**DB change:** Create `tournament_participants` table.

**Deliverables:**
- RSVP "Going" on a tournament event creates a `tournament_participants` row automatically
- Leaderboard section on EventDetail: ranked list of participants with scores and placements
  - Pre-event: shows registered participants, no scores yet
  - Post-event (or when admin starts entering scores): shows live leaderboard
- Admin score entry: inline score input next to each participant's name, saves on blur/enter
- Result note field (withdraw, DQ)
- Placement computed in JS: sorted by score (direction from `lower_is_better`), tied scores share placement

**Estimated scope:** Medium. New table, new leaderboard UI section, admin inline editing.

---

### Phase 3 — Analytics expansion
**Scope:** New panels on the admin Analytics dashboard using data from Phases 1–2.

**DB change:** None (reads from existing tables).

**Deliverables:**
- Participation overview panel (event_rsvps + events)
- Tournament panel: org-wide leaderboard and per-member stats (tournament_participants + events)
- Volunteer hours panel (event_rsvps + events filtered by type)
- Most active members panel (composite query)

**Estimated scope:** Medium. Read-only queries, new chart/table components.

---

### Future phases (not yet scoped)
- **Bracket mode tournaments** — head-to-head results, bracket visualization, double elimination
- **Round robin mode** — win/loss/draw record, standings table
- **Team tournaments** — team formation, team-level results alongside individual
- **Recurring events** — practice/meeting schedules with per-instance attendance (significant scope, separate doc)

---

## Resolved decisions

| Decision | Resolution |
|----------|-----------|
| RSVP vs separate tournament registration | Same action for now; decouple later if deadline/capacity needs diverge |
| Volunteer hour verification | No check-in table; credit granted automatically to 'going' RSVPs once event ends |
| Individual vs team tournaments | Individual only for Phase 2; team support is a future phase |
| Bracket visualization | Deferred until bracket mode is scoped; leaderboard mode first |
| Score storage | Stored in `tournament_participants.score`; placement derived at query time, not stored |
| Hours computation | Computed in JS from `event.end_at - event.start_at`; no generated column needed |
