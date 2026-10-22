import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from './api.service';
import { assetUrl } from './asset-url';

const API_ORIGIN = new URL(API_BASE_URL).origin;

describe('assetUrl', () => {
  it('points /uploads references at the API host', () => {
    expect(assetUrl('/uploads/profile_pics/seekers/a.png')).toBe(
      `${API_ORIGIN}/uploads/profile_pics/seekers/a.png`,
    );
    expect(assetUrl('/uploads/resume/r.pdf')).toBe(`${API_ORIGIN}/uploads/resume/r.pdf`);
  });

  it('leaves absolute URLs alone', () => {
    expect(assetUrl('https://cdn.example.com/logo.svg')).toBe('https://cdn.example.com/logo.svg');
    expect(assetUrl('http://localhost:5000/uploads/x.png')).toBe(
      'http://localhost:5000/uploads/x.png',
    );
    expect(assetUrl('//cdn.example.com/logo.svg')).toBe('//cdn.example.com/logo.svg');
  });

  it('leaves app-local assets on the frontend origin', () => {
    expect(assetUrl('/logos/google.png')).toBe('/logos/google.png');
    expect(assetUrl('favicon.ico')).toBe('favicon.ico');
  });

  it('leaves inline sources alone', () => {
    expect(assetUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(assetUrl('blob:http://localhost/x')).toBe('blob:http://localhost/x');
  });

  it('trims and reports missing values as empty', () => {
    expect(assetUrl('  /uploads/a.png  ')).toBe(`${API_ORIGIN}/uploads/a.png`);
    expect(assetUrl('')).toBe('');
    expect(assetUrl('   ')).toBe('');
    expect(assetUrl(null)).toBe('');
    expect(assetUrl(undefined)).toBe('');
  });

  it('is idempotent', () => {
    const once = assetUrl('/uploads/a.png');
    expect(assetUrl(once)).toBe(once);
  });
});
