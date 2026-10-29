import { describe, expect, it } from 'vitest';
import type { DataSource, Repository } from 'typeorm';
import { BadRequestError } from '../../common/exceptions/domain.exceptions';
import type { Job, Employer } from '../../database/entities';
import { EmployerJobService } from './employer-job.service';

describe('EmployerJobService.create CRN validation', () => {
  it('throws BadRequestError if employer has no CRN', async () => {
    const jobsRepo = {} as unknown as Repository<Job>;
    const employerRepo = {
      findOne: async () => ({ employerId: 1, companyName: 'Acme', crn: null }),
    };
    const dataSource = {
      getRepository: (entity: unknown) => employerRepo,
    } as unknown as DataSource;

    const service = new EmployerJobService(jobsRepo, dataSource);

    await expect(
      service.create(1, {
        title: 'Developer',
        description: 'Great role',
        location: 'Remote',
        job_type: 'full_time',
      }),
    ).rejects.toThrow(BadRequestError);
  });

  it('proceeds with transaction if employer has a valid CRN', async () => {
    const jobsRepo = {} as unknown as Repository<Job>;
    const employerRepo = {
      findOne: async () => ({ employerId: 1, companyName: 'Acme', crn: 'CRN-12345678' }),
    };
    const dataSource = {
      getRepository: (entity: unknown) => employerRepo,
      transaction: async (cb: (manager: any) => Promise<any>) => {
        return cb({
          save: async () => ({ jobId: 42 }),
          delete: async () => {},
          insert: async () => {},
        });
      },
    } as unknown as DataSource;

    const service = new EmployerJobService(jobsRepo, dataSource);

    const jobId = await service.create(1, {
      title: 'Developer',
      description: 'Great role',
      location: 'Remote',
      job_type: 'full_time',
    });

    expect(jobId).toBe(42);
  });
});
