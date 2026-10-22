import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Express } from 'express';
import { Repository } from 'typeorm';
import { BadRequestError } from '../../common/exceptions/domain.exceptions';
import { normalizeSkillName, SkillProficiency } from '../../common/enums/domain.enum';
import { normalizeSkillInputs } from '../../database/sql';
import { JobSeeker, SeekerSkill, Skill } from '../../database/entities';
import { ImageStorage } from '../storage/image-storage/image-storage';
import { ResumeStorage } from '../storage/resume-storage.service';
import type { UpdateSeekerProfileDto, UpdateSkillsDto } from './dto/seeker.dto';
import {
  toSeekerProfileDto,
  type SeekerProfileDto,
} from './mappers/seeker-profile.mapper';

/** The seeker's own profile: identity fields, resume, avatar and skills. */
@Injectable()
export class SeekerProfileService {
  constructor(
    @InjectRepository(JobSeeker) private readonly seekers: Repository<JobSeeker>,
    @InjectRepository(SeekerSkill) private readonly seekerSkills: Repository<SeekerSkill>,
    private readonly resumeStorage: ResumeStorage,
    private readonly imageStorage: ImageStorage,
  ) {}

  async getProfile(seekerId: number): Promise<SeekerProfileDto> {
    const seeker = await this.findOrFail(seekerId);
    const skills = await this.loadSkills(seekerId);
    return toSeekerProfileDto(seeker, skills);
  }

  async updateProfile(seekerId: number, dto: UpdateSeekerProfileDto): Promise<void> {
    const patch = this.pickUpdatable(dto);
    if (Object.keys(patch).length === 0) {
      throw new BadRequestError('No valid fields provided for update.');
    }

    const result = await this.seekers.update({ seekerId }, patch);
    if (result.affected === 0) {
      throw new NotFoundException('Profile not found.');
    }
  }

  /** Replaces the resume. */
  async updateResume(seekerId: number, file?: Express.Multer.File): Promise<{ path: string; filename: string }> {
    if (!file?.buffer) {
      throw new BadRequestError('No file uploaded. Please select a PDF.');
    }

    const stored = this.resumeStorage.save(file.buffer, file.originalname);

    const result = await this.seekers.update(
      { seekerId },
      { resumePath: stored.path, resumeFilename: stored.filename },
    );

    if (result.affected === 0) {
      throw new NotFoundException('User profile not found.');
    }

    return stored;
  }

  async getResume(seekerId: number): Promise<{ absolutePath: string; filename: string }> {
    const seeker = await this.findOrFail(seekerId);
    if (!seeker.resumePath) {
      throw new NotFoundException('No resume found for this account.');
    }

    const absolutePath = this.resumeStorage.resolve(seeker.resumePath);
    const fallback = `resume-${seekerId}.pdf`;

    return {
      absolutePath,
      filename: seeker.resumeFilename || this.resumeStorage.downloadName(seeker.resumePath, fallback),
    };
  }

  async updatePhoto(seekerId: number, file?: Express.Multer.File): Promise<string> {
    if (!file?.buffer) {
      throw new BadRequestError('No image file uploaded.');
    }

    const url = await this.imageStorage.upload(
      file.buffer,
      'profile_pics/seekers',
      file.originalname,
    );

    const result = await this.seekers.update({ seekerId }, { profilePictureUrl: url });
    if (result.affected === 0) {
      throw new NotFoundException('Profile not found.');
    }

    return url;
  }

  /** Full replacement: skills are declarative, so the set is rewritten outright. */
  async updateSkills(seekerId: number, dto: UpdateSkillsDto): Promise<void> {
    const normalized = this.normalize(dto);

    await this.seekerSkills.manager.transaction(async (manager) => {
      await manager.delete(SeekerSkill, { seekerId });

      for (const entry of normalized) {
        let skill = await manager
          .getRepository(Skill)
          .createQueryBuilder('s')
          .where('s.skill_name = :name', { name: entry.name })
          .getOne();

        if (!skill) {
          skill = await manager.save(Skill, { skillName: entry.name });
        }

        await manager.insert(SeekerSkill, {
          seekerId,
          skillId: skill.skillId,
          proficiency: entry.proficiency,
        });
      }
    });
  }

  private normalize(dto: UpdateSkillsDto): { name: string; proficiency: SkillProficiency }[] {
    // Get unique normalized names using the shared utility
    const uniqueNames = normalizeSkillInputs(
      dto.skills.map((s) => s.name),
      normalizeSkillName,
    );

    // Map back to include proficiency (first occurrence wins)
    const entries: { name: string; proficiency: SkillProficiency }[] = [];
    const seen = new Set<string>();

    for (const skill of dto.skills) {
      const name = normalizeSkillName(skill.name);
      if (!name || !uniqueNames.includes(name) || seen.has(name)) continue;
      seen.add(name);
      entries.push({ name, proficiency: skill.proficiency ?? SkillProficiency.BEGINNER });
    }

    if (entries.length === 0) {
      throw new BadRequestError('Skills must contain at least one non-empty name.');
    }

    return entries;
  }

  private pickUpdatable(dto: UpdateSeekerProfileDto): Partial<JobSeeker> {
    const patch: Partial<JobSeeker> = {};
    if (dto.full_name !== undefined) patch.fullName = dto.full_name ?? null;
    if (dto.phone_number !== undefined) patch.phoneNumber = dto.phone_number ?? null;
    if (dto.education !== undefined) patch.education = dto.education ?? null;
    if (dto.experience_years !== undefined) patch.experienceYears = dto.experience_years ?? null;
    return patch;
  }

  private async loadSkills(seekerId: number): Promise<{ name: string; proficiency: string }[]> {
    const rows = await this.seekerSkills
      .createQueryBuilder('ss')
      .innerJoin(Skill, 's', 's.skill_id = ss.skill_id')
      .select('s.skill_name', 'name')
      .addSelect('ss.proficiency', 'proficiency')
      .where('ss.seeker_id = :seekerId', { seekerId })
      .orderBy('s.skill_name', 'ASC')
      .getRawMany<{ name: string; proficiency: string }>();

    return rows;
  }

  private async findOrFail(seekerId: number): Promise<JobSeeker> {
    const seeker = await this.seekers.findOne({ where: { seekerId } });
    if (!seeker) {
      throw new NotFoundException('Profile not found.');
    }
    return seeker;
  }
}

