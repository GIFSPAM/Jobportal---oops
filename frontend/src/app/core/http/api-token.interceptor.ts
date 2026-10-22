import { HttpInterceptorFn } from '@angular/common/http';
import { TOKEN_STORAGE_KEY } from '../auth/token.util';

/**
 * Attaches `Authorization: Bearer <token>` to every outgoing API request.
 *
 * Reading the token per-request (instead of at construction) means a login or
 * logout takes effect immediately without rebuilding the HTTP pipeline.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
