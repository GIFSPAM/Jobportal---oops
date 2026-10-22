# Job Portal — OOP port (NestJS + Angular)

A ground-up reimplementation of `JOB-PORTAL` (Express + React) with a **NestJS**
backend and an **Angular** frontend, built to exercise object-oriented design:
high cohesion inside features, low coupling across them, and a small number of
well-named seams where the system is expected to change.

The feature set is intentionally identical to the reference application — the
same routes, endpoints, payloads and user-facing behaviour — so the interesting
differences are structural rather than functional.

```
Jobportal - oops/
├── backend/      NestJS 12 API  (TypeORM + MariaDB)
├── frontend/     Angular 22 SPA (Tailwind CSS v4)
├── docker/       MariaDB image + one-time schema bootstrap
└── docker-compose.yml
```

---

## Quick start

Prerequisites: **Node 20+**, **Docker**.

```bash
# 1. Database (creates ./docker volume, applies docker/mariadb-init/01-schema.sql)
docker compose up -d db

# 2. Install
cd backend  && npm install
cd ../frontend && npm install

# 3. Environment — backend/.env must define DB_USER, DB_PASS, JWT_SECRET, ADMIN_SECRET
#    (validateEnvironment fails fast on boot rather than half-starting the app)

# 4. Seed demo data (idempotent — safe to re-run)
cd ../backend && npm run db:init

# 5. Run
npm run start:dev          # API  -> http://localhost:5000/api
cd ../frontend && npx ng serve   # SPA -> http://localhost:4200
```

`docker compose up backend frontend` runs both through Compose instead.

### Demo accounts

Created by `backend/seeds/demo-data.sql`. Password for all three: `DemoPass123!`

| Role      | Email                        |
| --------- | ---------------------------- |
| Jobseeker | `seeker.demo@jobytes.test`   |
| Employer  | `employer.demo@jobytes.test` |
| Admin     | `admin.demo@jobytes.test`    |

---

## Design

### Backend

Modules are sliced **by use case**, not by technical layer. A request enters
through one controller, is validated by a DTO, executed by a service, and shaped
by a mapper — no layer reaches around another.

```
src/
├── main.ts                 bootstrap: prefix, CORS, static assets, validation
├── app.module.ts           composition root — the ONLY place modules are wired
├── common/                 shared kernel (guards, filters, interceptors,
│                           decorators, enums, exceptions, interfaces)
├── config/                 typed configuration + fail-fast env validation
├── database/               entities, DatabaseModule, reusable SQL fragments
└── modules/
    ├── auth/       register · login · JWT · session resolution
    ├── public/     guest job catalogue, landing feed, skills typeahead
    ├── seeker/     profile · applications · saved jobs · stats
    ├── employer/   jobs · applicants · profile · stats
    ├── admin/      moderation · users · audit log
    └── storage/    resume upload/download · image storage
```

**How the design goals are met**

| Principle | Where it shows up |
| --- | --- |
| **High cohesion** | `SeekerModule` is four services — `SeekerProfileService`, `SeekerApplicationService`, `SeekerSavedJobService`, `SeekerStatsService` — each owning one reason to change, rather than a single 600-line `SeekerService`. |
| **Low coupling** | Feature modules depend only on `common/` and `database/`; they never import each other, so the dependency graph is a star, not a mesh. `app.module.ts` is the sole composition root. |
| **Single responsibility** | Authentication (`JwtAuthGuard`) and authorisation (`RolesGuard`) are separate guards registered in order; either can change without touching the other. |
| **Open/closed, Dependency Inversion** | `ImageStorage` is an abstract contract. `LocalImageStorage` and `CloudinaryImageStorage` are chosen in `StorageModule`; the seeker/employer modules that consume imagery know nothing about where bytes land. |
| **Encapsulation of cross-cutting behaviour** | One `HttpExceptionFilter` turns every failure into `{success:false,message}`; one `ResponseEnvelopeInterceptor` produces every success. Controllers return domain results, never transport shapes. |
| **Fail-closed security** | Routes are protected by default; `@Public()` opts out explicitly. A missing, malformed, stale, or deactivated-account token never reaches a controller. |

DTOs are validated by `class-validator` (global `ValidationPipe` with
`whitelist`, so a broad registration payload persists only the columns it owns),
and mappers keep database column names out of the HTTP contract.

### Frontend

```
src/app/
├── app.routes.ts        lazy routes + role redirects
├── core/                auth (service, guard, token util), http transport
│                        + interceptors, models, mappers, toast, feature APIs
├── shared/              presentational components + pipes
├── layout/              nav, footer
└── pages/               one folder per route
```

- `ApiService` is the only class that knows the API origin, envelope shape and
  query serialisation; feature services (`JobsService`, `SeekerService`,
  `EmployerService`, `AdminService`) translate rows into typed UI models via
  `core/mappers`, so components never see a raw payload.
- Components are standalone, use `inject()`/signals, and render only — data
  access stays in services and loading/error state stays declarative.
- Auth is guarded centrally; `dashboard-route.ts` maps a role to its landing
  page so redirects live in one place.

---

## API contract

Everything lives under the `/api` prefix.

**Success envelope** (produced by `ResponseEnvelopeInterceptor`):

```json
{ "success": true, "message": "Optional.", "data": {}, "count": 0 }
```

**Failure envelope** (produced by `HttpExceptionFilter`):

```json
{ "success": false, "message": "Human-readable reason." }
```

**Authentication** — `Authorization: Bearer <jwt>`. The payload carries a
top-level `user_id` and `role` because the client decodes its own token to make
navigation decisions.

| Status | Meaning |
| --- | --- |
| `401` | Missing / invalid / stale token, or deactivated account |
| `403` | Authenticated, but the role is wrong for the resource |
| `404` | Resource not found (or not owned by the caller) |
| `409` | State conflict, e.g. duplicate email or re-applying to a job |
| `400` | Validation failure, bad upload type, or broken business rule |

---

## Scripts

**backend**

| Command | What it does |
| --- | --- |
| `npm run start:dev` | Watch-mode API |
| `npm run build` | Compile to `dist/` |
| `npm run db:init` | Apply schema **and** demo data (idempotent) |
| `npm run db:seed` | Demo data only |
| `npm run test:smoke` | 86-assertion end-to-end suite over live HTTP (requires API + DB) |
| `npm run lint` / `npm run format` | oxlint / prettier |

**frontend**

| Command | What it does |
| --- | --- |
| `npx ng serve` | Dev server |
| `npx ng build` | Production build |
| `npx tsc -p tsconfig.app.json --noEmit` | Type-check only |

`backend/scripts/smoke-test.mjs` walks the whole product as an outsider, a
jobseeker, an employer and an admin: registration and login, cross-role
rejections, profile and skill edits, resume/photo upload and download
authorisation, the full job lifecycle (post → verify → apply → shortlist →
revoke → delete) and the audit trail.

---

## Deliberate deviations from the reference

The port favours correctness and clarity where the two goals collide. Each
change below is intentional.

1. **`401` for a missing/invalid token** — the reference returned `403`. `401`
   is the semantically correct "authenticate first" signal, and it lets the
   client distinguish *log in* from *you lack permission*.
2. **`403` only for a role mismatch** — keeps the two failure modes distinct.
3. **Password minimum length 6** — validated up front by DTO instead of relying
   on a database error.
4. **`resume_url` is a host-less path** (`/api/auth/resume-download/:id`)
   rather than an absolute URL baked into the payload, so the contract holds
   behind any hostname or reverse proxy.
5. **Resumes are never served as static files** — only `uploads/profile_pics`
   is exposed read-only. Resume bytes are reachable exclusively through the
   authorised download endpoints that check ownership.
6. **`is_verified` is a real boolean** in JSON, not a `0`/`1` integer.
7. **`PATCH /admin/verify-job/:id` is idempotent** — re-verifying returns `200`,
   matching correct `PATCH` semantics; only a genuinely missing job is `404`.
8. **Admin status changes always write an audit entry** — the reference skipped
   logging when the acting admin already owned the record; an audit trail that
   skips rows is not much of a trail.

---

## Verification status

**Backend**

| Gate | Result |
| --- | --- |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run typecheck` (`tsc --noEmit`) | clean |
| `npx nest build` | clean |
| `npm test` | **30 passed** — envelope, exception filter, roles guard, SQL fragments |
| `npm run test:smoke` | **86 passed, 0 failed** over live HTTP against MariaDB 11.8 |
| `npm run db:init` run twice back-to-back | idempotent — 27 users, 8 jobs, 9 skills, 5 applications unchanged |

**Frontend**

| Gate | Result |
| --- | --- |
| `npx ng build` | clean — 26 lazy chunks |
| `npx tsc -p tsconfig.app.json --noEmit` | clean |
| `npx ng test` | **2 passed** (app shell) |

**Fidelity**

- **45 / 45 endpoints** ported 1:1 by method and path (public 4, auth 3, seeker 15, employer 11, admin 12).
- **29 / 29 routes** ported 1:1, including all six legacy redirects and every role guard.
- **Client wiring:** every API path the Angular services reference — 20 literal plus
  19 interpolated call sites — was cross-checked against the controller routes.
  `GET /admin/jobs/:job_id` does not exist in the reference either, so job detail
  resolves over `all-jobs` client-side, exactly like React's `fetchAdminJobById`.
- **Theme:** the reference app is pure black; this port deliberately ships the
  light palette instead. 148 dark-theme carryover colour classes were corrected —
  text first (`text-white` → `text-text-main`, `*-400` → `*-700`), then the fills
  and borders (`border-white/*`, `bg-white/3|5|10`) mapped onto the real
  `styles.css` tokens. No illegible carryover remains on a light surface; the
  `text-white` that survives is white on the orange accent, where it is correct.

**Not verified:** no browser was connected to this session, so confirmation is
build/type-check plus API level only — the UI has not been exercised visually.

## Notes

- TypeORM is pinned to `^0.3.x`; the 1.x line has an incompatible repository API.
- `backend/scratch/` holds the exploratory verification scripts used while
  building the API; they are not part of the shipped surface.
- Uploads land in `backend/uploads/` (git-ignored); profile imagery is served
  statically, resumes are not.
