import { AdminJob, AdminUser } from '../../core/models/admin';
import { Job } from '../../core/models/job';
import { assetUrl } from '../../core/http/asset-url';

/**
 * Presentation helpers shared by the three admin pages and their tab panels.
 *
 * The React app gets these from `utils/formatters` plus small local helpers;
 * keeping them as pure functions (instead of component methods) means the
 * label/tone rules can never drift between the dashboard and the detail pages.
 */

/** Date-only label (`toLocaleDateString`), or "Unknown" for bad input. */
export function formatDateShort(dateValue?: string | null): string {
  if (!dateValue) return 'Unknown';
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? 'Unknown' : parsed.toLocaleDateString();
}

/** Full date+time label (`toLocaleString`), or "Unknown" for bad input. */
export function formatDateTime(dateValue?: string | null): string {
  if (!dateValue) return 'Unknown';
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? 'Unknown' : parsed.toLocaleString();
}

/** `$min - $max` salary label; "Not specified" unless both bounds exist. */
export function formatSalaryRange(
  salaryMin?: number | string | null,
  salaryMax?: number | string | null,
): string {
  if (salaryMin != null && salaryMax != null) {
    return `$${Number(salaryMin).toLocaleString()} - $${Number(salaryMax).toLocaleString()}`;
  }
  return 'Not specified';
}

/** Adds `https://` to bare domains so the job website link is clickable. */
export function normalizeWebsiteUrl(website?: string | null): string | null {
  const trimmed = website?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Role caption used by detail labels and screen-reader text. */
export function roleLabel(role?: string): string {
  if (role === 'jobseeker') return 'Seeker';
  if (role === 'employer') return 'Employer';
  if (role === 'admin') return 'Admin';
  return 'Unknown';
}

/** Compact pill caption inside lists (raw role, except "Seeker"). */
export function rolePillLabel(role?: string): string {
  return role === 'jobseeker' ? 'Seeker' : (role ?? '');
}

/** Background/foreground classes for the role pill. */
export function roleBadgeClass(role?: string): string {
  if (role === 'jobseeker') return 'bg-brand-accent/10 text-brand-accent border-brand-accent/20';
  if (role === 'employer') return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
  return 'bg-[#FAF8F3] text-text-muted border-[#E8E3D8]';
}

/** Background/foreground classes for the Active/Inactive pill. */
export function activityBadgeClass(isActive: boolean): string {
  return isActive
    ? 'text-green-700 bg-green-500/10 border-green-500/20'
    : 'text-red-700 bg-red-500/10 border-red-500/20';
}

/** Normalizes the backend's boolean-or-0/1 `is_active` flag. */
export function isUserActive(user: AdminUser): boolean {
  return Boolean(user.is_active);
}

/** Display name: seeker name, employer company, otherwise the email. */
export function userDisplayName(user: AdminUser | null): string {
  if (user?.role === 'jobseeker') return user.full_name || 'Unnamed seeker';
  if (user?.role === 'employer') return user.company_name || 'Unnamed employer';
  return user?.email || 'Unnamed user';
}

/** List-row label — like `userDisplayName` but never "Unnamed user". */
export function userListLabel(user: AdminUser): string {
  if (user.role === 'jobseeker') return user.full_name || 'Unnamed seeker';
  if (user.role === 'employer') return user.company_name || 'Unnamed employer';
  return user.email;
}

/** Avatar URL for a user, picking the role-specific picture first. */
export function userAvatarSrc(user: AdminUser | null): string {
  if (!user) return '';
  if (user.role === 'employer') {
    return assetUrl(user.employer_profile_picture_url ?? user.profile_picture_url ?? '');
  }
  if (user.role === 'jobseeker') {
    return assetUrl(
      user.seeker_profile_picture_url ?? user.profile_picture_url ?? user.avatar_url ?? '',
    );
  }
  return assetUrl(user.profile_picture_url ?? user.avatar_url ?? '');
}

/** First letter of the display name for the avatar placeholder. */
export function userAvatarFallback(user: AdminUser | null): string {
  const name = userDisplayName(user).trim();
  return name ? name.charAt(0).toUpperCase() : 'U';
}

/** Maps an admin moderation row onto the shared `Job` model used by cards. */
export function toCardJob(job: AdminJob): Job {
  return {
    id: Number(job.job_id),
    title: job.title,
    company: job.company_name ?? 'Unknown company',
    location: job.location ?? 'No location',
    salary: formatSalaryRange(job.salary_min, job.salary_max),
    type: job.job_type || 'Unknown',
    logo: assetUrl(job.logo ?? job.profile_picture_url),
    employerId: job.employer_id,
    description: job.description,
    postedAt: job.posted_at,
    skills: Array.isArray(job.skills) ? job.skills : [],
    isVerified: Boolean(job.is_verified),
    status: job.status,
  };
}

/** Capitalised target-table name for the logs table ("Users", "Jobs"). */
export function targetTableLabel(table?: string): string {
  if (!table) return 'Unknown';
  return table.charAt(0).toUpperCase() + table.slice(1);
}

/**
 * Colour classes for a log's action pill.
 *
 * Verbatim port of the React `actionToneClass` — including its branch order,
 * where "Unverified…"/"Deactivated…" match the `verify`/`activate` keywords
 * first; kept identical so audit logs look the same on both apps.
 */
export function actionToneClass(action?: string): string {
  const normalized = String(action ?? '').toLowerCase();
  if (normalized.includes('delete') || normalized.includes('reject')) {
    return 'text-red-700 bg-red-500/10 border-red-500/20';
  }
  if (normalized.includes('activate') || normalized.includes('verify') || normalized.includes('hired')) {
    return 'text-green-700 bg-green-500/10 border-green-500/20';
  }
  if (normalized.includes('unverify') || normalized.includes('deactivate')) {
    return 'text-yellow-700 bg-yellow-500/10 border-yellow-500/20';
  }
  return 'text-brand-accent bg-brand-accent/10 border-brand-accent/20';
}
