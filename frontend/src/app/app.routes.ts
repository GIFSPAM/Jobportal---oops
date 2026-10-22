import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

/**
 * Application route table. Every route is lazy (`loadComponent`) and guarded
 * routes use the role-based `authGuard` factory.
 *
 * Static segments (`new`, `edit`, `skills`) are declared before their `:param`
 * siblings so the literal segments always win.
 *
 * Plan routes (from frontend-pages-modular-structure.md):
 *   /jobs                      → JobsBrowsePage (public)
 *   /seeker/skills             → SeekerSkillsPage (jobseeker)
 *   /employer/my-jobs/:jobId/edit → EmployerEditJobPage (employer)
 *   /admin/users               → AdminUsersPage (admin)
 *   /admin/employers           → AdminEmployersPage (admin)
 *   /admin/seekers             → AdminSeekersPage (admin)
 *   /admin/jobs/moderation     → AdminJobsModerationPage (admin)
 *   /unauthorized              → UnauthorizedPage (guest)
 *   /forbidden                 → ForbiddenPage (authenticated, wrong role)
 *   ** (404)                   → NotFoundPage (catch-all)
 */
export const routes: Routes = [
  {
    path: '',
    title: 'JOBYTES — Find Your Dream Job',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'login',
    title: 'Login — JOBYTES',
    data: { mode: 'login' },
    loadComponent: () => import('./pages/auth/auth.page').then((m) => m.AuthPage),
  },
  {
    path: 'register',
    title: 'Register — JOBYTES',
    data: { mode: 'register' },
    loadComponent: () => import('./pages/auth/auth.page').then((m) => m.AuthPage),
  },
  {
    path: 'admin',
    title: 'Admin Login — JOBYTES',
    data: { mode: 'login' },
    loadComponent: () => import('./pages/auth/auth.page').then((m) => m.AuthPage),
  },
  {
    path: 'unauthorized',
    title: 'Sign In Required — JOBYTES',
    loadComponent: () => import('./pages/auth/unauthorized.page').then((m) => m.UnauthorizedPage),
  },
  {
    path: 'forbidden',
    title: 'Access Denied — JOBYTES',
    loadComponent: () => import('./pages/auth/forbidden.page').then((m) => m.ForbiddenPage),
  },

  // --- Public ---
  {
    path: 'jobs',
    title: 'Jobs — JOBYTES',
    loadComponent: () => import('./pages/jobs/jobs-browse.page').then((m) => m.JobsBrowsePage),
  },
  {
    path: 'jobs/:jobId',
    title: 'Job Details — JOBYTES',
    canActivate: [authGuard()],
    loadComponent: () => import('./pages/jobs/job-detail.page').then((m) => m.JobDetailPage),
  },
  {
    path: 'employers/:employerId',
    title: 'Company — JOBYTES',
    canActivate: [authGuard()],
    loadComponent: () =>
      import('./pages/jobs/employer-detail.page').then((m) => m.EmployerDetailPage),
  },
  {
    path: 'explore-jobs',
    title: 'Explore Jobs — JOBYTES',
    canActivate: [authGuard('jobseeker')],
    loadComponent: () =>
      import('./pages/explore-jobs/explore-jobs.page').then((m) => m.ExploreJobsPage),
  },

  // --- Job seeker ---
  {
    path: 'seeker/dashboard',
    title: 'Dashboard — JOBYTES',
    canActivate: [authGuard('jobseeker')],
    loadComponent: () =>
      import('./pages/seeker/seeker-dashboard.page').then((m) => m.SeekerDashboardPage),
  },
  {
    path: 'seeker/applications',
    title: 'My Applications — JOBYTES',
    canActivate: [authGuard('jobseeker')],
    loadComponent: () =>
      import('./pages/seeker/applications.page').then((m) => m.SeekerApplicationsPage),
  },
  {
    path: 'seeker/saved-jobs',
    title: 'Saved Jobs — JOBYTES',
    canActivate: [authGuard('jobseeker')],
    loadComponent: () =>
      import('./pages/seeker/saved-jobs.page').then((m) => m.SeekerSavedJobsPage),
  },
  {
    path: 'seeker/profile',
    title: 'My Profile — JOBYTES',
    canActivate: [authGuard('jobseeker')],
    loadComponent: () =>
      import('./pages/seeker/seeker-profile.page').then((m) => m.SeekerProfilePage),
  },
  // --- Employer ---
  {
    path: 'employer/dashboard',
    title: 'Employer Dashboard — JOBYTES',
    canActivate: [authGuard('employer')],
    loadComponent: () =>
      import('./pages/employer/employer-dashboard.page').then((m) => m.EmployerDashboardPage),
  },
  {
    // Static segment first so it never gets swallowed by `:applicationId`.
    path: 'employer/applications/job/:jobId',
    title: 'Job Applicants — JOBYTES',
    canActivate: [authGuard('employer')],
    loadComponent: () =>
      import('./pages/employer/employer-job-applicants.page').then(
        (m) => m.EmployerJobApplicantsPage,
      ),
  },
  {
    path: 'employer/applications/:applicationId',
    title: 'Applicant — JOBYTES',
    canActivate: [authGuard('employer')],
    loadComponent: () =>
      import('./pages/employer/employer-applicant-detail.page').then(
        (m) => m.EmployerApplicantDetailPage,
      ),
  },
  {
    path: 'employer/applications',
    title: 'Applications — JOBYTES',
    canActivate: [authGuard('employer')],
    loadComponent: () =>
      import('./pages/employer/employer-applications.page').then(
        (m) => m.EmployerApplicationsPage,
      ),
  },
  {
    // `new` is declared before `:jobId` so the literal wins over the param.
    path: 'employer/my-jobs/new',
    title: 'Post a Job — JOBYTES',
    canActivate: [authGuard('employer')],
    loadComponent: () =>
      import('./pages/employer/employer-post-job.page').then((m) => m.EmployerPostJobPage),
  },
  {
    path: 'employer/my-jobs/:jobId',
    title: 'Job Details — JOBYTES',
    canActivate: [authGuard('employer')],
    loadComponent: () =>
      import('./pages/employer/employer-my-job-detail.page').then(
        (m) => m.EmployerMyJobDetailPage,
      ),
  },
  {
    path: 'employer/my-jobs',
    title: 'My Jobs — JOBYTES',
    canActivate: [authGuard('employer')],
    loadComponent: () =>
      import('./pages/employer/employer-my-jobs.page').then((m) => m.EmployerMyJobsPage),
  },
  {
    path: 'employer/profile',
    title: 'Company Profile — JOBYTES',
    canActivate: [authGuard('employer')],
    loadComponent: () =>
      import('./pages/employer/employer-profile.page').then((m) => m.EmployerProfilePage),
  },

  // --- Admin ---
  {
    path: 'admin/dashboard',
    title: 'Admin Dashboard — JOBYTES',
    canActivate: [authGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/admin-dashboard.page').then((m) => m.AdminDashboardPage),
  },
  {
    path: 'admin/users',
    title: 'User Management — JOBYTES',
    canActivate: [authGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/admin-users.page').then((m) => m.AdminUsersPage),
  },
  {
    path: 'admin/users/:userId',
    title: 'User Details — JOBYTES',
    canActivate: [authGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/admin-user-detail.page').then((m) => m.AdminUserDetailPage),
  },
  {
    path: 'admin/employers',
    title: 'Employer Directory — JOBYTES',
    canActivate: [authGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/admin-employers.page').then((m) => m.AdminEmployersPage),
  },
  {
    path: 'admin/seekers',
    title: 'Seeker Directory — JOBYTES',
    canActivate: [authGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/admin-seekers.page').then((m) => m.AdminSeekersPage),
  },
  {
    path: 'admin/jobs/moderation',
    title: 'Job Moderation — JOBYTES',
    canActivate: [authGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/admin-jobs-moderation.page').then((m) => m.AdminJobsModerationPage),
  },
  {
    path: 'admin/jobs/:jobId',
    title: 'Job Moderation — JOBYTES',
    canActivate: [authGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/admin-job-detail.page').then((m) => m.AdminJobDetailPage),
  },

  // --- Legacy redirects (kept from the React app) ---
  { path: 'dashboard/seeker', redirectTo: 'seeker/dashboard', pathMatch: 'full' },
  { path: 'dashboard/employer', redirectTo: 'employer/dashboard', pathMatch: 'full' },
  { path: 'dashboard/admin', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: 'admin/users', redirectTo: 'admin/users', pathMatch: 'full' },
  { path: 'admin/jobs', redirectTo: 'admin/jobs/moderation', pathMatch: 'full' },
  { path: 'admin/logs', redirectTo: 'admin/dashboard?tab=logs', pathMatch: 'full' },

  // --- 404 (must be last) ---
  { path: '**', title: '404 — JOBYTES', loadComponent: () => import('./pages/auth/not-found.page').then((m) => m.NotFoundPage) },
];