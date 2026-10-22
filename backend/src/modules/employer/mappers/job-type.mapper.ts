import { JobType } from '../../../common/enums/domain.enum';

/** Maps the accepted `job_type` spellings onto the three schema enum values. */
export function normalizeJobType(value: string): JobType {
  switch (value.trim().toLowerCase().replace('-', '_')) {
    case 'full_time':
      return JobType.FULL_TIME;
    case 'part_time':
      return JobType.PART_TIME;
    case 'internship':
      return JobType.INTERNSHIP;
    default:
      throw new Error(`Unsupported job type: ${value}`);
  }
}
