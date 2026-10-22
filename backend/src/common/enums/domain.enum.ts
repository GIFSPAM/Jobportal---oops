/** Domain enumerations. */
export enum UserRole {
  JOBSEEKER = 'jobseeker',
  EMPLOYER = 'employer',
  ADMIN = 'admin',
}

export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  INTERNSHIP = 'internship',
}

export enum JobStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum ApplicationStatus {
  APPLIED = 'applied',
  SHORTLISTED = 'shortlisted',
  REJECTED = 'rejected',
  HIRED = 'hired',
}

export enum SkillProficiency {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum CompanySize {
  SIZE_1_10 = '1-10',
  SIZE_11_50 = '11-50',
  SIZE_51_200 = '51-200',
  SIZE_201_500 = '201-500',
  SIZE_500_PLUS = '500+',
}

/** All skill names are stored lower-cased and trimmed. */
export const normalizeSkillName = (value: string): string =>
  String(value ?? '')
    .trim()
    .toLowerCase();
