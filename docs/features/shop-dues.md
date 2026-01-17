# Feature spec: Shop & Dues

## Goal
Allow organizations to collect dues and sell items.

## Core user stories
- As an admin, I can list items and set prices.
- As a member, I can purchase items and pay dues.
- As an admin, I can see purchase history.

## Scope (MVP)
- Items list and checkout flow
- Dues payment (single plan)
- Basic purchase history

## Data model
- ShopItem: id, orgId, name, description, price, active
- Order: id, orgId, userId, total, status, createdAt
- OrderItem: id, orderId, itemId, quantity, priceAtPurchase
- DuesPlan: id, orgId, name, price, active

## Permissions
- Manage items/dues: owner/admin
- Purchase: members

## API (draft)
- GET `/orgs/:orgId/shop/items`
- POST `/orgs/:orgId/shop/items`
- GET `/orgs/:orgId/orders`
- POST `/orgs/:orgId/dues/checkout`

## UI notes
- Shop module card on dashboard
- Dues status badge in account area

## TDD checklist
- Only owner/admin can manage items
- Orders are org-scoped
- Members can view their own orders
