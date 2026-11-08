# SiteTrack implementation plan

Build order for the take-home. Keep this file updated as steps land so context survives new chats.

## Ground rules (every step)

- Authz is on the server. A non-member hitting a project ID gets **404**, not 403 (do not confirm the project exists).
- Member without enough privilege (e.g. not a project admin) gets **403**.
- Role and membership are loaded from the DB on each request so a kick or role change applies immediately.
- List endpoints return only what that person may see.
- Pagination and indexes from the start.
- Domain primary keys are **UUIDs**. Public project/task IDs (`PRJ-0001`, `PRJ-0042-T-0001`) are separate sequential codes and are never reused.
- SuperAdmin sees every project. Company store manager sees membership projects plus the company store. User sees membership only.

## Step 0 — Nest scaffold, auth, config, db

**Status: done**

- NestJS layout matching Rais-Shop-API (config, TypeORM/Postgres, JWT access + refresh, sessions, swagger, docker, seed).
- App roles: `USER`, `COMPANY_STORE_MANAGER`, `SUPER_ADMIN`.
- Register, login, refresh, logout, `GET /users/me`.
- Failed login returns generic invalid credentials.
- Logout deletes the session so that refresh/access pair stops working.

## Step 1 — Access helper + project core

**Status: done**

- Entities: `Project`, `ProjectMember` (`isAdmin`), `ProjectCounter` (company-wide sequence for `PRJ-xxxx`).
- Create project → creator is project admin, code `PRJ-0001`, …
- Get / update / delete with membership checks.
- List: search by name or code, `lateOnly`, sort by name / start date / % done / late tasks.
- Task stats on the list are zeros until Step 4.
- `AccessService`: `assertCanAccessProject`, `assertProjectAdmin`, store-manager helper.

## Step 2 — Members, invitations, notifications

**Status: done**

- Invite a registered user by email, withdraw a pending invite.
- Invitee sees it in notifications and accepts or rejects (only they can; anyone else gets 404).
- Join the project only after accept (`isAdmin: false`).
- Promote / demote project admin, remove members.
- Never leave a project with zero project admins.
- `GET /notifications/unread-count` for the badge; mark read without answering is allowed.
- Seed: pending invite on `PRJ-0001` from `user@sitetrack.com` to `storemanager@sitetrack.com`.

## Step 3 — Materials catalogue

**Status: done**

- Shared `Material` (name, category, unit). UUID PK. Unique name.
- Any logged-in user can create, list, update, delete.
- List: search by name, filter by category, sort by name or category.
- `GET /materials/categories` for filter options. No stock yet.

## Step 4 — Tasks, dependencies, status

**Status: next**

- `Task`, `TaskDependency`, per-project task counter (`PRJ-xxxx-T-yyyy`, never reused).
- Dependencies only in the same project; reject cycles.
- Status actions: Start (all waited-on tasks Done), Mark done (from In progress), Reopen (no dependent has started).
- Late and Blocked are derived, never set by the client.
- List filters and task details (ancestors/descendants with distance).

## Step 5 — Stores and stock

**Status: pending**

- One company store. One project store per project.
- Stock rows: quantity, reorder point (company store), last delivery date (project store).
- Company store status: Out of stock / Low / Available.
- Only store manager + SuperAdmin add company stock and set reorder points.

## Step 6 — Deliveries

**Status: pending**

- Sender initiates → stock leaves immediately → In transit.
- Record / reject / cancel with stock movements in one transaction.
- Company ↔ project only. No negative quantity under concurrency.
- Delivery is immutable after initiate.

## Step 7 — Scale, seed, Docker, README

**Status: pending**

- Indexes and list-query performance for assignment-scale data.
- Large seeder + `docker compose up` as the only setup.
- README: decisions, trade-offs, what we would do with more time. Swagger is the API doc.

## Locked decisions

1. Compute Late/Blocked in queries first; denormalize later if lists are slow.
2. Missing project and unauthorized project both return 404.
3. Register allows choosing SuperAdmin because the brief says the role is chosen at register (product risk, noted).
4. Short-lived access token; logout kills the session.
5. `project_counters` (and later a task counter) exist only to mint sequential public codes under a row lock. UUID `id` is the FK.
