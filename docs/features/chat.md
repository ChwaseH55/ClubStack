# Feature spec: Chat rooms

## Goal
Provide real-time communication for members.

## Core user stories
- As a member, I can send messages in a chat room.
- As a member, I can see new messages in real-time.
- As an admin, I can moderate or remove messages.

## Scope (MVP)
- Org-wide default chat room
- Message list with timestamps
- Basic moderation (delete message)

## Data model
- ChatRoom: id, orgId, name
- ChatMessage: id, orgId, roomId, authorId, content, createdAt

## Permissions
- Send/read: all members
- Moderate/delete: owner/admin

## API (draft)
- GET `/orgs/:orgId/chat/rooms`
- GET `/orgs/:orgId/chat/rooms/:roomId/messages`
- POST `/orgs/:orgId/chat/rooms/:roomId/messages`
- DELETE `/orgs/:orgId/chat/messages/:id`

## UI notes
- Module card linking to chat room
- Real-time indicator and typing state (later)

## TDD checklist
- Messages are org-scoped and room-scoped
- Only members can post messages
- Moderation removes messages from view
