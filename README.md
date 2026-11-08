# SiteTrack API

Backend for SiteTrack, a construction project and materials tracker. NestJS, TypeORM, PostgreSQL.

Swagger is at `/api-docs`.

## Run

### Docker

`docker compose up --build` starts Postgres and the API. On boot the API creates the schema and loads the small demo dataset. No other setup is required.

API: `http://localhost:3000/api/v1`  
Docs: `http://localhost:3000/api-docs`

### Local

Copy `.env-example` to `.env`, then:

```bash
npm install
npm run start:dev
npm run seed
```

### Demo accounts

Password for every account below is `password123`.

| Role | Email |
| --- | --- |
| SuperAdmin | superadmin@sitetrack.com |
| Company store manager | storemanager@sitetrack.com |
| User | user@sitetrack.com |

The demo seed also creates `PRJ-0001` (the user above is its project admin), a pending invitation to the store manager, four tasks with dependencies, four materials, company stock, and one in-transit cement delivery.

## Scale dataset

The assignment test volume is loaded separately. This **replaces** whatever is in the database.

```bash
npm run seed:scale
```

Inside Docker, after the stack is up:

```bash
docker compose exec nest-app npm run seed:scale
```

It inserts at least:

| Data | Volume |
| --- | --- |
| Users | 5,000 |
| Projects | 2,000 (some with 50 members) |
| Invitations | 50,000 |
| Tasks | 500,000 (one project has 3,000) |
| Task dependencies | 1,000,000+ |
| Materials | 20,000 |
| Deliveries | 400,000 |
| Delivery lines | 3,000,000 |

The three demo accounts are recreated with the same password. Expect several minutes. Dependencies only point at earlier task numbers in the same project, so the graph has no cycles. Stock quantities are a snapshot for the list screens; they are not the result of replaying every historical delivery.

## Decisions

- **NestJS modules** follow the same shape as the rest of this codebase: config wrappers, TypeORM, JWT access + refresh, class-validator, Swagger.
- **Primary keys are UUIDs.** Public project and task ids (`PRJ-0001`, `PRJ-0001-T-0001`) are separate codes from a locked counter, so they stay unique under concurrent creates and are never reused.
- **Sessions.** The refresh token is stored only as a hash. Logout deletes that session, so the access token and refresh token from it stop working. Access tokens stay short (15 minutes); refresh keeps an active user signed in.
- **Hidden projects are 404.** A missing id and an id the caller cannot see return the same empty 404. A member who lacks a project-admin action gets 403.
- **Role and membership are read from the database on each request**, so a removal or role change applies on the next call.
- **Late and Blocked are computed**, never stored. A task can be both.
- **Task dependencies** are a directed graph inside one project. A new edge is rejected when it would make a task wait on itself.
- **Deliveries** move stock in one transaction with a row lock. The sender loses quantity at initiate. Record credits the receiver. Reject and cancel put it back. A delivery is not edited after that.
- **Company store** is one row. Each project gets its own store when the project is created. Project stores never deliver to each other.
- **Register includes the app role** because the brief says the person chooses it. That includes SuperAdmin.

## Trade-offs

- Schema changes use TypeORM `synchronize` instead of migrations. That is enough for this assignment and unsafe for a database you cannot drop.
- Task lists and dependency checks load one project's tasks into memory. The cap in the brief is 3,000 tasks in a project, which is comfortable. A project far beyond that would need the graph in SQL.
- Lists use offset pagination. The first pages stay fast with the indexes on project, status, and delivery dates. A deep page of 400,000 deliveries gets slower; keyset pagination would fix that.
- The scale seed does not replay 400,000 stock movements. Rebuilding a perfect ledger was not needed to exercise the screens.
- Failed login uses one message. Register still says when an email is taken, which is a small information leak the brief did not forbid.

## With more time

- Migrations, and a read model for project task counts so the projects screen does not scan tasks per row.
- Keyset pagination on deliveries, tasks, and notifications.
- Stop letting registration pick SuperAdmin; invite that role from an existing SuperAdmin.
- Notify project members when a delivery is sent, not only when they are invited.
- A background job if Late/Blocked ever need to be filtered across every project at once without reading tasks.
