import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { errorInterceptor } from './core/http/api-error.interceptor';
import { tokenInterceptor } from './core/http/api-token.interceptor';

/**
 * Application-wide providers.
 *
 * Interceptor order matters: the token interceptor runs first (attaching the
 * bearer header) and the error interceptor runs after it, so it can translate
 * *any* failure — including ones produced downstream — into a friendly `Error`.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // The React app had a ScrollToTop helper; this is its Angular equivalent.
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([tokenInterceptor, errorInterceptor])),
  ],
};
