# Frontend — Angular SPA

The Job Portal UI. Angular 22, standalone components, signals, and Tailwind CSS v4.

See the [root README](../README.md) for quick start, the overall design rationale,
and the list of deliberate deviations from the reference implementation.

---

## Layering rules

```
page component  →  feature service  →  ApiService  →  HttpInterceptor  →  /api
       ↑                  ↑
     shared/          core/mappers
```

| Rule | Why |
| --- | --- |
| Components render and delegate; they never build a URL or call `HttpClient`. | Keeps templates declarative and data access testable in isolation. |
| Only `ApiService` knows the API origin, envelope shape and query serialisation. | One place to change when the transport contract changes. |
| Feature services (`JobsService`, `SeekerService`, `EmployerService`, `AdminService`) map rows through `core/mappers`. | A backend column rename cannot leak into a template. |
| Routes are lazy (`loadComponent`) and guarded by `authGuard(role)`. | Role rules live in the router, not scattered per component. |

## Structure

```
src/app/
├── app.routes.ts        lazy routes + role redirects + legacy redirects
├── app.config.ts        providers (router, HttpClient + interceptors)
├── core/                everything a page needs but does not render
│   ├── auth/            AuthService, authGuard, token util, dashboard-route
│   ├── http/            ApiService + bearer & error interceptors
│   ├── models/          typed DTOs per feature (auth, job, seeker, employer, admin)
│   ├── mappers/         raw payload → UI model
│   ├── seeker|employer|admin|jobs/   feature API surfaces
│   └── toast/           ToastService + ToastComponent
├── shared/              presentational components + pipes (no data fetching)
├── layout/              Nav, Footer
└── pages/               one folder per route
```

`shared/` is deliberately free of HTTP. Anything that needs data takes it as an
input, which keeps the same card/badge usable from four different pages.

## Routes

| Path | Access |
| --- | --- |
| `/` | public |
| `/login`, `/register`, `/admin` | public |
| `/jobs/:jobId`, `/employers/:employerId` | signed in |
| `/explore-jobs`, `/seeker/dashboard`, `/seeker/applications`, `/seeker/saved-jobs`, `/seeker/profile` | jobseeker |
| `/employer/dashboard`, `/employer/applications[...]`, `/employer/my-jobs[...]`, `/employer/profile` | employer |
| `/admin/dashboard`, `/admin/users/:userId`, `/admin/jobs/:jobId` | admin |

Legacy redirects from the React app (`/dashboard/seeker`, `/admin/users`, …) are
preserved so existing bookmarks keep working. Anything unmatched goes home.

## API integration

- `ApiService` exposes `get/post/put/patch/delete<T>`, each returning
  `Observable<ApiEnvelope<T>>`.
- `API_BASE_URL` (re-exported as `ApiService.baseUrl`) is the single place the
  API origin is declared, currently `http://localhost:5000/api` to match the
  local development setup.
- `apiTokenInterceptor` attaches `Authorization: Bearer …`.
- `apiErrorInterceptor` unwraps `{success:false, message}` into an `Error` the
  toast layer can show, and forces a logout on `401`.
- Uploads pass `FormData` directly as the body; the browser sets the boundary.

## Theming

The reference application is pure black; **this port deliberately uses a light
warm palette** (`--bg #FAF8F3`, white cards, `#1F2A24` text). The tokens live in
`src/styles.css`.

Because the colour classes were originally written for a dark background, a few
carry-overs are not legible on white. When porting or adding markup:

- use `text-text-main` / `text-text-muted`, not `text-white`
- badge and accent text on a `*/10` tint uses the `*-700` shade, not `*-400`
- borders on white cards use `border-[#D8D2C4]` / `border-[#E8E3D8]`, not `border-white/10`

## Scripts

```bash
npm start        # ng serve  -> http://localhost:4200
npm run build    # ng build -> dist/
npm run watch    # development rebuild on change
npm test         # ng test (vitest)
npx tsc -p tsconfig.app.json --noEmit   # type-check only
```

The dev server expects the API on `http://localhost:5000/api`.
