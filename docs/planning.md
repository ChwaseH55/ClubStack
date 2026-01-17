# Planning (pre-coding)

This document captures the decisions and details that should be clarified
before implementation begins. The goal is to avoid rework by aligning on
scope, flows, and data boundaries early.

## Product scope and MVP boundaries
- Which feature modules are in MVP vs later phases
- What “custom dashboard” means for users (layout, navigation, modules)
- Whether features can be added/removed after org creation

## User flows
- Org owner sign-up and org creation flow
- Feature selection and configuration flow
- Member invite/join flow (invite link vs approval)
- Role changes and permissions boundaries

## Data model decisions
- Org, user, membership, role schema details
- Feature configuration storage and validation
- Multi-tenant data isolation approach

## Permissions and roles
- Define owner/admin/member capabilities per feature
- Access to admin dashboards and moderation tools
- Feature-level permissions (e.g., who can post announcements)

## UI/UX expectations
- Dashboard layout and module navigation
- Feature empty states and onboarding
- Mobile vs desktop behavior

## Technical choices
- Frontend framework and hosting
- Backend stack and database
- Auth (email/password vs OAuth)
- Realtime needs (chat, notifications)

## Testing strategy
- Define TDD scope per feature file in `docs/features/`
- Choose testing tools (unit, integration, e2e)
- Define staging vs production data strategy

## Non-functional requirements
- Performance targets
- Security and privacy requirements
- Audit logs and admin actions

