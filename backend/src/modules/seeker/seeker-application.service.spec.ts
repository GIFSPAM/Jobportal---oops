import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Repository } from 'typeorm';
import type { Application, Job, JobSeeker, JobSkill } from '../../database/entities';
import { SeekerApplicationService } from './seeker-application.service';

/** Chainable stand-in for TypeORM's query builder: every builder method returns itself and `getRawMany` resolves the canned `skill_name` rows. */
const skillQueryBuilder = (names: string[]) => {
  const builder: Record<string, unknown> = {};
  for (const method of ['innerJoin', 'select', 'addSelect', 'where', 'orderBy']) {
    builder[method] = () => builder;
  }
  builder.getRawMany = async () => names.map((skill_name) => ({ skill_name }));
  return builder;
};

interface Fixture {
  /** `false` simulates a closed or unverified posting (the 404 path). */
  found?: boolean;
  jobSkills?: string[];
  seekerSkills?: string[];
}

/** Builds a service whose only behaviour is the data in {@link Fixture}. */
function build({ found = true, jobSkills = [], seekerSkills = [] }: Fixture = {}): SeekerApplicationService {
  const jobs = {
    findOne: async () => (found ? { jobId: 1, status: 'open', isVerified: true } : null),
  } as unknown as Repository<Job>;

  const jobSkillsRepo = {
    createQueryBuilder: () => skillQueryBuilder(jobSkills),
  } as unknown as Repository<JobSkill>;

  const seekers = {
    createQueryBuilder: () => skillQueryBuilder(seekerSkills),
  } as unknown as Repository<JobSeeker>;

  const applications = {} as unknown as Repository<Application>;

  return new SeekerApplicationService(applications, seekers, jobs, jobSkillsRepo);
}

describe('SeekerApplicationService.jobMatch', () => {
  it('scores case-insensitively so seeded display names still match', async () => {
    // Seed rows keep `Angular`, while `PUT /seeker/skills` stores `angular`.
    const match = await build({
      jobSkills: ['Angular', 'TypeScript'],
      seekerSkills: ['angular', 'typescript', 'sql'],
    }).jobMatch(1, 1);

    expect(match.match_percentage).toBe(100);
    expect(match.matched_skills).toEqual(['Angular', 'TypeScript']);
    expect(match.missing_skills).toEqual([]);
    expect(match.matched_skills_count).toBe(2);
    expect(match.total_job_skills).toBe(2);
  });

  it('scores a partial overlap as a percentage', async () => {
    const match = await build({
      jobSkills: ['Angular', 'SQL', 'Docker'],
      seekerSkills: ['angular'],
    }).jobMatch(1, 1);

    expect(match.match_percentage).toBe(33.33);
    expect(match.matched_skills).toEqual(['Angular']);
    expect(match.missing_skills).toEqual(['SQL', 'Docker']);
    expect(match.matched_skills_count).toBe(1);
    expect(match.matched_skills.length + match.missing_skills.length).toBe(match.total_job_skills);
  });

  it('treats a posting with no declared skills as a perfect match', async () => {
    const match = await build({ jobSkills: [], seekerSkills: ['angular'] }).jobMatch(1, 1);

    expect(match.match_percentage).toBe(100);
    expect(match.total_job_skills).toBe(0);
    expect(match.matched_skills).toEqual([]);
    expect(match.missing_skills).toEqual([]);
  });

  it('returns 0 when the seeker holds none of the required skills', async () => {
    const match = await build({ jobSkills: ['Figma'], seekerSkills: ['angular'] }).jobMatch(1, 1);

    expect(match.match_percentage).toBe(0);
    expect(match.missing_skills).toEqual(['Figma']);
  });

  it('keeps the stored display spelling in the response payload', async () => {
    const match = await build({
      jobSkills: ['Nest.js'],
      seekerSkills: ['NEST.JS'],
    }).jobMatch(1, 1);

    expect(match.matched_skills).toEqual(['Nest.js']);
    expect(match.missing_skills).toEqual([]);
  });

  it('refuses a posting that is not open and verified', async () => {
    await expect(build({ found: false }).jobMatch(1, 1)).rejects.toBeInstanceOf(NotFoundException);
  });
});
