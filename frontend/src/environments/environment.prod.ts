/**
 * Build-time configuration for production builds.
 *
 * Replace `apiBaseUrl` here (or in CI, before `ng build`) to point a deployed
 * bundle at its API. Keeping it in a separate file means a development build
 * can never accidentally ship a hardcoded origin, and vice versa.
 */
export const environment = {
  apiBaseUrl: 'http://localhost:5000/api',
} as const;
