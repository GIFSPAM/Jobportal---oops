import { API_BASE_URL } from './api.service';

/**
 * Uploaded files (`/uploads/...`) come back from the API root-relative, but
 * the app is served from its own origin — `localhost:4200` in dev, whatever a
 * reverse proxy terminates in prod. A bare `/uploads/x.png` therefore resolves
 * against the frontend, where nothing serves that path (the dev server answers
 * with index.html), so the request 404s and every avatar and company logo
 * silently fell back to the placeholder.
 *
 * Prefixing the API host — derived from the same `apiBaseUrl` the REST calls
 * already use — keeps images and API traffic pointed at one place without
 * threading a second configuration value through the app.
 */
const EXTERNAL = /^(?:https?:)?\/\//i;

/** Origin of the API host, e.g. `http://localhost:5000`. */
function backendOrigin(): string {
  try {
    // A relative `apiBaseUrl` means a reverse proxy serves both — same origin.
    return new URL(API_BASE_URL, globalThis.location?.origin ?? 'http://localhost').origin;
  } catch {
    return '';
  }
}

/**
 * Resolves a stored file reference to something an `<img>` can load.
 *
 * Absolute URLs, `data:`/`blob:` URIs and app-local assets (`/logos/...`)
 * pass through untouched; `/uploads/...` is pointed at the API host. Empty
 * input returns `''` so `@if (assetUrl(...))` guards keep working.
 */
export function assetUrl(path: string | null | undefined): string {
  const value = String(path ?? '').trim();
  if (!value) return '';
  if (EXTERNAL.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }
  if (value.startsWith('/uploads/')) {
    return `${backendOrigin()}${value}`;
  }
  return value;
}
