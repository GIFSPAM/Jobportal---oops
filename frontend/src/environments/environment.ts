/**
 * Build-time configuration for development builds (`ng serve`, `ng build`).
 *
 * Swapped for `environment.prod.ts` by the `fileReplacements` entry in
 * `angular.json`, so the deployed bundle can point at a real API without any
 * application code changing — mirroring the reference app's
 * `VITE_API_BASE_URL` override.
 */
export const environment = {
  apiBaseUrl: 'http://localhost:5000/api',
} as const;
