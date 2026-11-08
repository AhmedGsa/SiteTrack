# SiteTrack API

Backend API for SiteTrack, a construction project and materials tracker.

## Setup

### 1. Local

- Copy `.env-example` to `.env` and fill in the values
- Run `npm install`
- Run `npm run start:dev`

#### Seed data

- Run `npm run seed`

### 2. Docker

- Run `docker compose up --build`

Swagger is available at `/api-docs`.

### Seeded users

| Role | Email | Password |
| --- | --- | --- |
| SuperAdmin | superadmin@sitetrack.com | password123 |
| Company store manager | storemanager@sitetrack.com | password123 |
| User | user@sitetrack.com | password123 |
