# Data model

All org-scoped tables include `org_id` to enforce multi-tenant isolation.
No cross-org joins are permitted; every query filters by `org_id`.

## Organization
- id (uuid)
- name (string)
- slug (string, unique)
- branding: { logoUrl, primaryColor } (jsonb)
- enabled_features (string[]) — e.g. `["announcements", "events", "forum", "chat", "shop"]`
- created_at

## User
- id (uuid)
- email (string, unique)
- name (string)
- password_hash (string)
- avatar_url (string, nullable)
- created_at

## Membership
- id (uuid)
- org_id → Organization
- user_id → User
- role (enum: owner | admin | member)
- status (enum: invited | active | suspended)
- joined_at
- unique constraint: (org_id, user_id)

## FeatureConfiguration
- id (uuid)
- org_id → Organization
- feature_key (string) — matches key in enabled_features
- settings (jsonb) — feature-specific config

## Announcement
- id (uuid)
- org_id → Organization
- title (string)
- body (text)
- author_id → User
- created_at, updated_at

## Event
- id (uuid)
- org_id → Organization
- title (string)
- description (text)
- location (string)
- start_at, end_at (timestamptz)
- created_by → User

## EventRegistration
- id (uuid)
- org_id → Organization
- event_id → Event
- user_id → User
- status (enum: registered | cancelled)
- unique constraint: (event_id, user_id)

## ForumPost
- id (uuid)
- org_id → Organization
- title (string)
- body (text)
- author_id → User
- created_at, updated_at

## ForumComment
- id (uuid)
- org_id → Organization
- post_id → ForumPost
- author_id → User
- body (text)
- created_at

## ChatRoom
- id (uuid)
- org_id → Organization
- name (string)

## ChatMessage
- id (uuid)
- org_id → Organization
- room_id → ChatRoom
- author_id → User
- content (text)
- created_at

## ShopItem
- id (uuid)
- org_id → Organization
- name (string)
- description (text)
- price (numeric 10,2)
- active (boolean)
- image_url (string, nullable)

## Order
- id (uuid)
- org_id → Organization
- user_id → User
- total (numeric 10,2)
- status (enum: pending | paid | refunded)
- created_at

## OrderItem
- id (uuid)
- order_id → Order
- item_id → ShopItem
- quantity (int)
- price_at_purchase (numeric 10,2)

## DuesPlan
- id (uuid)
- org_id → Organization
- name (string)
- price (numeric 10,2)
- active (boolean)
