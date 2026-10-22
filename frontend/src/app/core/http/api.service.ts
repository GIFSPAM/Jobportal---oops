import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api';

/** Single source of truth for the API origin used by every request. */
export const API_BASE_URL = environment.apiBaseUrl;

/** Query-string values accepted by the typed helpers. */
export type ApiQueryParams = Record<string, string | number | boolean>;

/**
 * Thin typed transport over `HttpClient`.
 *
 * Features never build URLs or touch `HttpClient` directly: keeping the base
 * URL, envelope shape and query serialisation here means a contract change is a
 * one-file change.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /** Base URL every helper prefixes with — exported for error messages/tests. */
  readonly baseUrl = API_BASE_URL;

  /** `GET` returning the full response envelope typed by `T` (`data`). */
  get<T>(path: string, params?: ApiQueryParams): Observable<ApiEnvelope<T>> {
    return this.http.get<ApiEnvelope<T>>(this.url(path), { params: this.toHttpParams(params) });
  }

  /** `POST` returning the full response envelope typed by `T` (`data`). */
  post<T>(path: string, body: unknown): Observable<ApiEnvelope<T>> {
    return this.http.post<ApiEnvelope<T>>(this.url(path), body);
  }

  /** `PUT` returning the full response envelope typed by `T` (`data`). */
  put<T>(path: string, body: unknown): Observable<ApiEnvelope<T>> {
    return this.http.put<ApiEnvelope<T>>(this.url(path), body);
  }

  /** `PATCH` returning the full response envelope typed by `T` (`data`). */
  patch<T>(path: string, body: unknown): Observable<ApiEnvelope<T>> {
    return this.http.patch<ApiEnvelope<T>>(this.url(path), body);
  }

  /** `DELETE` returning the full response envelope typed by `T` (`data`). */
  delete<T>(path: string): Observable<ApiEnvelope<T>> {
    return this.http.delete<ApiEnvelope<T>>(this.url(path));
  }

  /**
   * `POST` with a multipart body (resume/logo/photo uploads).
   *
   * `Content-Type` is deliberately left unset so the browser owns the boundary.
   */
  postForm<T>(path: string, formData: FormData): Observable<ApiEnvelope<T>> {
    return this.http.post<ApiEnvelope<T>>(this.url(path), formData);
  }

  /** `PUT` with a multipart body (resume replacement uses `PUT`). */
  putForm<T>(path: string, formData: FormData): Observable<ApiEnvelope<T>> {
    return this.http.put<ApiEnvelope<T>>(this.url(path), formData);
  }

  /**
   * Authenticated binary download (resume files).
   *
   * Goes through `HttpClient` rather than a plain link so the bearer interceptor
   * attaches the token — an `<a href>` would be rejected as unauthenticated.
   */
  download(path: string): Observable<Blob> {
    return this.http.get(this.url(path), { responseType: 'blob' });
  }

  /** Joins a path onto the base URL without doubling slashes. */
  private url(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /** Converts a plain object into `HttpParams` so callers stay framework-free. */
  private toHttpParams(params?: ApiQueryParams): HttpParams {
    let httpParams = new HttpParams();
    if (!params) {
      return httpParams;
    }
    for (const [key, value] of Object.entries(params)) {
      httpParams = httpParams.set(key, String(value));
    }
    return httpParams;
  }
}
