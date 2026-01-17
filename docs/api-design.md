# API design (draft)

## Auth
- POST `/auth/register`
- POST `/auth/login`

## Organizations
- POST `/orgs` create organization
- GET `/orgs/:orgId` get org details
- PATCH `/orgs/:orgId` update branding/settings

## Features
- GET `/orgs/:orgId/features`
- PUT `/orgs/:orgId/features` replace feature set

## Members
- POST `/orgs/:orgId/invites`
- POST `/orgs/:orgId/join`
- GET `/orgs/:orgId/members`

