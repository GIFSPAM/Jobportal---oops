# Backend — NestJS API

The HTTP surface of the Job Portal. Every route lives under the `api` prefix
(`http://localhost:5000/api`).

See the [root README](../README.md) for quick start, design rationale and the
list of deliberate deviations from the reference implementation.

---

## Layering rules

A request always travels the same path. Nothing skips a layer or reaches
sideways into another feature.

```
controller  →  DTO (validate)  →  service (business rules + persistence)  →  mapper (contract shape)
```

| Rule | Why |
| --- | --- |
| Controllers declare status codes and call services; they contain no logic. | Keeps the HTTP surface declarative and the rules testable without a request. |
| Services return domain data, never transport payloads. | Mappers are the single place that decides what a response looks like. |
| Mappers own every field-name decision. | A column rename becomes a one-file change and cannot leak `snake_case` into the contract. |
| Feature modules import `common/` and `database/` only. | The dependency graph stays a star; features cannot become entangled. |
| Nothing outside `app.module.ts` wires modules together. | One composition root, so the object graph is inspectable at a glance. |

## `common/` — the shared kernel

| File | Responsibility |
| --- | --- |
| `guards/jwt-auth.guard.ts` | Global, fail-closed authentication. `@Public()` opts out. |
| `guards/roles.guard.ts` | Authorisation from `@Roles(...)` metadata; runs after auth. |
| `filters/http-exception.filter.ts` | Turns *any* throw into `{success:false,message}`; opaque 500s, friendly Multer errors. |
| `interceptors/response-envelope.interceptor.ts` | Produces every `{success:true,…}` body. |
| `exceptions/domain.exceptions.ts` | `BadRequest/Unauthorized/Forbidden/NotFound/Conflict` — status code lives with the concept. |
| `decorators/` | `@Public()`, `@Roles()`, `@CurrentUser()`. |

Guards are registered globally in `app.module.ts`, so an endpoint is protected
unless it explicitly opts out.

## Endpoints (45, matching the reference contract)

| Prefix | Role | Endpoints |
| --- | --- | --- |
| `/auth` | public | `POST register` · `POST login` |
| `/auth` | owner | `GET resume-download/:application_id` |
| `/public` | public | `GET jobs` · `GET landing-jobs` · `GET jobs/:job_id` · `GET skills` |
| `/seeker` | jobseeker | `GET stats` · `POST apply/:job_id` · `GET my-applications` · `DELETE revoke/:application_id` · `GET job-match/:job_id` · `POST\|GET\|DELETE saved-jobs[/:job_id]` · `GET\|PUT profile` · `PUT skills` · `POST photo` · `PUT profile/resume` · `GET profile/resume/download` · `GET jobs/employer/:job_id` |
| `/employer` | employer | `GET stats` · `POST post` · `GET my-jobs` · `PUT update/:job_id` · `PATCH status/:job_id` · `DELETE delete-jobs/:job_id` · `GET applicants/:job_id` · `PATCH application-status/:application_id` · `GET\|PUT profile` · `POST logo` |
| `/admin` | admin | `GET stats` · `GET employers` · `GET seekers` · `GET users` · `GET users/:user_id` · `PATCH users/:user_id/status` · `DELETE users/:user_id` · `GET all-jobs` · `DELETE jobs/:job_id` · `PATCH verify-job/:job_id` · `PATCH unverify-job/:job_id` · `GET logs` |

## Storage

`StorageModule` isolates everything that touches bytes:

- **Resumes** — `ResumeStorageService` stores them outside the statically served
  tree. Downloads go through `ResumeDownloadController`, which authorises
  ownership (the seeker who uploaded, or the employer of the job they applied to).
- **Images** — behind the abstract `ImageStorage` contract. `StorageModule`
  binds either `LocalImageStorage` (disk, served at `/uploads/profile_pics/`) or
  `CloudinaryImageStorage` depending on configuration; the modules that upload
  avatars and logos depend on the abstraction only.

## Environment

Validated at boot by `config/env.validation.ts`; the process refuses to start
rather than running half-configured.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | no | Defaults `localhost` / `3306` / `job_portal` |
| `DB_USER` / `DB_PASS` | **yes** | Database credentials |
| `JWT_SECRET` | **yes** | Signing key |
| `ADMIN_SECRET` | **yes** | Gate for registering an `admin` account |
| `PORT` | no | Defaults to `5000` |
| `BCRYPT_ROUNDS` | no | Defaults to `10` |
| `UPLOADS_DIR` | no | Defaults to `uploads` |

## Scripts

```bash
npm run start:dev      # watch mode
npm run build          # compile to dist/
npm run db:init        # schema + demo data (idempotent)
npm run db:seed        # demo data only
npm run test:smoke     # end-to-end suite; needs a running API and database
npm run lint           # oxlint
npm run format         # prettier
```

## Testing

`scripts/smoke-test.mjs` is an HTTP-level suite that exercises the product the
way a client would: guest browsing, registration and login, cross-role
rejections, profile and skill edits, resume/photo upload plus download
authorisation, the full job lifecycle, and the admin audit trail. It exits
non-zero on any failure, so it can gate CI.

```bash
npm run db:init && npm run start:dev &
npm run test:smoke
```
