# Feature spec: Announcements

## Goal
Provide an official channel for org leaders to publish updates.

## Core user stories
- As an admin, I can create announcements with a title and body.
- As a member, I can view announcements in reverse chronological order.
- As an admin, I can edit or delete an announcement.

## Scope (MVP)
- Create, edit, delete announcements
- Announcement list and details view
- Basic search and filtering by date

## Data model
- Announcement: id, orgId, title, body, authorId, createdAt, updatedAt

## Permissions
- Create/edit/delete: owner/admin
- Read: all org members

## API (draft)
- GET `/orgs/:orgId/announcements`
- POST `/orgs/:orgId/announcements`
- PATCH `/orgs/:orgId/announcements/:id`
- DELETE `/orgs/:orgId/announcements/:id`

## UI notes
- Dashboard card with latest 3 announcements
- Dedicated page for full list

## TDD checklist
- Create announcement persists with correct orgId and authorId
- Only owner/admin can create/edit/delete
- Members see announcements sorted by createdAt desc
- Announcements are org-scoped (no cross-org access)
