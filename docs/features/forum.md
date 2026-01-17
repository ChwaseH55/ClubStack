# Feature spec: Forum

## Goal
Support threaded discussions for members.

## Core user stories
- As a member, I can create a post.
- As a member, I can comment on posts.
- As an admin, I can moderate posts.

## Scope (MVP)
- Post list and detail view
- Comments on posts
- Basic moderation (delete)

## Data model
- ForumPost: id, orgId, title, body, authorId, createdAt, updatedAt
- ForumComment: id, orgId, postId, authorId, body, createdAt

## Permissions
- Create/read: all members
- Delete/moderate: owner/admin

## API (draft)
- GET `/orgs/:orgId/forum/posts`
- POST `/orgs/:orgId/forum/posts`
- GET `/orgs/:orgId/forum/posts/:id`
- POST `/orgs/:orgId/forum/posts/:id/comments`
- DELETE `/orgs/:orgId/forum/posts/:id`
- DELETE `/orgs/:orgId/forum/comments/:id`

## UI notes
- Dashboard card links to forum
- Post list with author and date

## TDD checklist
- Posts/comments are scoped to org
- Members can create posts/comments
- Admin deletes remove posts/comments
