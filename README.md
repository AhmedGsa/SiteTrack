# SiteTrack API

SiteTrack is a construction project and materials tracker. Companies run many sites. Each site is a project with members, tasks, and its own store. The company has one central store. Materials move only between the company store and a project store.

This service is a NestJS API on PostgreSQL. It owns authentication, authorization, project membership, the task graph, stock, and deliveries. The HTTP API is under `/api/v1`. Swagger is at `/api-docs`.

## Run

`docker compose up --build` is the full setup. It starts Postgres and the API, creates the schema, and loads the demo dataset.

- API: `http://localhost:3000/api/v1`
- Docs: `http://localhost:3000/api-docs`
- Postgres, from the host: `localhost:55432`

To run it on a machine that already has Node and Postgres, copy `.env-example` to `.env`, then:

```bash
npm install
npm run start:dev
npm run seed
```

### Demo accounts

Every demo account uses the password `password123`.

| Role | Email |
| --- | --- |
| SuperAdmin | superadmin@sitetrack.com |
| Company store manager | storemanager@sitetrack.com |
| User | user@sitetrack.com |

The demo dataset also includes project `PRJ-0001` (the user above is its project admin), a pending invitation to the store manager, four tasks with dependencies, four materials, company stock, and one in-transit cement delivery of 25 bags.

## Scale dataset

`npm run seed:scale` replaces the database with a dataset large enough to exercise lists, filters, and the task graph. Inside Docker, after the stack is up:

```bash
docker compose exec nest-app npm run seed:scale
```

Expect several minutes. The three demo accounts are recreated with the same password. Volumes:

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

Dependencies only point at earlier task numbers in the same project, so the graph has no cycles. Stock quantities are a snapshot for the list screens. They are not a replay of every historical delivery.

## Automated checks

With the API running:

```bash
npm run smoke
```

`BASE_URL` defaults to `http://localhost:3000/api/v1`. The script registers its own users and walks the authorization and stock rules: a hidden project returns 404, the last project admin cannot be removed, a blocked task cannot start, a dependency cycle is rejected, a normal user cannot see the company store, a delivery cannot overdraw stock, recording it moves the quantity, and logout ends that session.

## Authorization

Passwords are stored as bcrypt hashes and are never returned. Login uses the same error whether the email is unknown or the password is wrong. Access tokens last 15 minutes. The refresh token is stored only as a hash on a session. Logout deletes that session, so both tokens from it stop working.

The caller's role and project membership are loaded from the database on each request. A missing project and a project the caller cannot see both return 404, so a response does not reveal that the project exists. A member who is not allowed to perform an admin action receives 403. SuperAdmin can open any project. The company store is visible only to a company store manager or a SuperAdmin; anyone else receives 404.

Registration accepts the role the caller chooses, including SuperAdmin, so any role can be created without a separate admin step.

## Domain rules

Public project and task codes (`PRJ-0001`, `PRJ-0001-T-0001`) come from a locked counter. They are not the primary key. Primary keys are UUIDs. Deleting a project or task does not reuse its code.

Late and Blocked are computed when tasks are read, not stored. A task is Late when it is not done and a planned date has passed. A task is Blocked when it is not done and some task it waits on, directly or through other tasks, is not done. A task can be both.

A task starts only from Not Started, and only when every task it waits on is Done. It is marked Done only from In Progress. Reopening a Done task is refused when a later task has already left Not Started. A new dependency is refused when it would make a task wait on itself.

There is one company store. Each project receives its own store when the project is created. Deliveries go from the company to a project, or from a project back to the company. Project stores do not deliver to each other. Stock cannot go below zero.

Initiating a delivery deducts the sender immediately and leaves the delivery In Transit. Recording it credits the receiver. Rejecting or cancelling it returns the quantity to the sender. Cancel is limited to the user who sent it. A delivery is not edited after it is initiated.
