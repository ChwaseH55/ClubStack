# Feature spec: Dashboard

## Goal
Render a tailored dashboard based on enabled feature modules.

## Core user stories
- As an owner, I see a dashboard with only enabled modules.
- As an admin, I can manage modules from the org settings.
- As a member, I can access enabled modules from the dashboard.

## Scope (MVP)
- Module tiles based on enabled features
- Latest items preview for key modules (announcements, events)
- Org branding on dashboard

## Data model
- Organization.enabledFeatures (array of keys)
- FeatureConfiguration (per feature settings)

## Permissions
- Configure modules: owner/admin
- View dashboard: members

## API (draft)
- GET `/orgs/:orgId`
- GET `/orgs/:orgId/features`
- PUT `/orgs/:orgId/features`

## UI notes
- Module registry maps feature keys to tiles
- Empty state when no features enabled

## TDD checklist
- Dashboard tiles match enabledFeatures
- Disabled modules are not visible
- Feature updates reflect without data leakage
