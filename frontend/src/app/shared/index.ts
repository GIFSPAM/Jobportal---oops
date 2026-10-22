/**
 * Public surface of the shared layer.
 *
 * Features import from `shared` (barrel) and never reach into another feature's
 * files; the barrel keeps that boundary explicit.
 */
export * from './components/detail-field-card/detail-field-card.component';
export * from './components/icon/icon.component';
export * from './components/job-card/job-card.component';
export * from './components/job-match-circle/job-match-circle.component';
export * from './components/logo/logo.component';
export * from './components/page-container/page-container.component';
export * from './components/skeleton/skeleton.component';
export * from './components/stat-card/stat-card.component';
export * from './components/status-badge/status-badge.component';
export * from './pipes/job-type.pipe';
export * from './pipes/date.pipe';
export * from './utils';
