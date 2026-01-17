# Feature spec: Calendar & Events

## Goal
List and manage organization events with optional registration.

## Core user stories
- As an admin, I can create events with date, time, and location.
- As a member, I can view upcoming events.
- As an admin, I can edit or cancel events.

## Scope (MVP)
- Event list and detail view
- Create/edit/delete events
- Basic calendar view (monthly)

## Data model
- Event: id, orgId, title, description, location, startAt, endAt, createdBy
- EventRegistration: id, orgId, eventId, userId, status

## Permissions
- Create/edit/delete: owner/admin
- View/register: all members

## API (draft)
- GET `/orgs/:orgId/events`
- POST `/orgs/:orgId/events`
- PATCH `/orgs/:orgId/events/:id`
- DELETE `/orgs/:orgId/events/:id`
- POST `/orgs/:orgId/events/:id/register`

## UI notes
- Calendar module tile on dashboard
- Upcoming events list on dashboard

## TDD checklist
- Event CRUD is org-scoped
- Members can view events
- Only owner/admin can edit/delete
