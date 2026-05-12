# Feature spec: Member Profile

## Goal
Give each member a profile page showing their account info, membership status,
dues payment status, and quick access to account settings.

## Reference
Adapted from GolfClubUCF's Account.js (user info + org membership details),
extended for ClubStack's multi-org roles, dues status, and avatar support.

## Core user stories
- As a member, I can view my display name, email, role, and join date.
- As a member, I can edit my display name and avatar.
- As a member, I can see my dues payment status when Shop is enabled.
- As a member, I can change my password.
- As an admin, I can view any member's profile within my org.

## Scope (MVP)
- Display name + avatar (initials fallback when no image)
- Email address (read-only)
- Membership role badge (owner / admin / member)
- Join date
- Dues status badge (paid / unpaid / n/a) when Shop feature is enabled
- Change password form

## Data model
- User: id, email, name, avatarUrl, createdAt
- Membership: orgId, userId, role, status, joinedAt
- Order: status (for dues payment status lookup)

## Permissions
- View own profile: all members
- Edit own profile (name, avatar): all members
- Change password: all members
- View other member profiles: owner/admin only
- Change roles: owner/admin (owner cannot self-demote)

## API (draft)
- `GET /users/me` — own profile
- `PATCH /users/me` — update name, avatarUrl
- `POST /users/me/password` — change password (requires currentPassword)
- `GET /orgs/:orgId/members/:userId` — admin view of any member

## UI notes
- Accessible from TopBar avatar dropdown → “Profile”
- Avatar: uploaded image or colored initials circle (first letter of name)
- Role badge: colored chip — owner = gold, admin = blue, member = gray
- Dues status badge only shown when org has Shop feature enabled
- Password change form requires current password before accepting new one

## TDD checklist
- Members can update their own name and avatar
- Password change requires correct current password
- Dues status reflects latest paid order for the org
- Admins can view any member’s profile within the org
- Members cannot view other members’ profiles
- Role badge matches membership.role
