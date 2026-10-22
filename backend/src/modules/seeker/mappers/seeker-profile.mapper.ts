import type { JobSeeker } from '../../../database/entities';

/** Transport shape of `GET /seeker/profile`. */
export interface SeekerProfileDto {
  seeker_id: number;
  full_name: string | null;
  phone_number: string | null;
  education: string | null;
  experience_years: number | null;
  resume_path: string | null;
  resume_filename: string | null;
  profile_picture_url: string | null;
  skills: { name: string; proficiency: string }[];
}

export function toSeekerProfileDto(
  seeker: JobSeeker,
  skills: { name: string; proficiency: string }[],
): SeekerProfileDto {
  return {
    seeker_id: seeker.seekerId,
    full_name: seeker.fullName,
    phone_number: seeker.phoneNumber,
    education: seeker.education,
    experience_years: seeker.experienceYears,
    resume_path: seeker.resumePath,
    resume_filename: seeker.resumeFilename,
    profile_picture_url: seeker.profilePictureUrl,
    skills,
  };
}
