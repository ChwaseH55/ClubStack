# Data model (draft)

## Organization
- id
- name
- slug
- branding (logoUrl, primaryColor)
- enabledFeatures (array)
- createdAt

## User
- id
- email
- name
- createdAt

## Membership
- id
- orgId
- userId
- role (owner, admin, member)
- status (invited, active, suspended)
- joinedAt

## Feature configuration
- id
- orgId
- featureKey
- settings (json)

