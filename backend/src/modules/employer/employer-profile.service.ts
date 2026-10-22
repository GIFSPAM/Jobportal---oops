import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Express } from 'express';
import { Repository } from 'typeorm';
import { BadRequestError } from '../../common/exceptions/domain.exceptions';
import { Employer } from '../../database/entities';
import { ImageStorage } from '../storage/image-storage/image-storage';
import type { UpdateEmployerProfileDto } from './dto/employer.dto';

export interface EmployerProfileDto {
  employer_id: number;
  company_name: string | null;
  company_phone: string | null;
  industry: string | null;
  company_size: string | null;
  company_location: string | null;
  company_website: string | null;
  profile_picture_url: string | null;
}

/** Company profile: read, partial update and logo replacement. */
@Injectable()
export class EmployerProfileService {
  constructor(
    @InjectRepository(Employer) private readonly employers: Repository<Employer>,
    private readonly imageStorage: ImageStorage,
  ) {}

  async getProfile(employerId: number): Promise<EmployerProfileDto> {
    return toProfile(await this.findOrFail(employerId));
  }

  async updateProfile(employerId: number, dto: UpdateEmployerProfileDto): Promise<void> {
    const patch = this.pick(dto);
    if (Object.keys(patch).length === 0) {
      throw new BadRequestError('No valid fields provided for update.');
    }

    const result = await this.employers.update({ employerId }, patch);
    if (result.affected === 0) {
      throw new NotFoundException('Employer profile not found.');
    }
  }

  async updateLogo(employerId: number, file?: Express.Multer.File): Promise<string> {
    if (!file?.buffer) {
      throw new BadRequestError('No image file uploaded.');
    }

    const url = await this.imageStorage.upload(
      file.buffer,
      'profile_pics/employers',
      file.originalname,
    );

    const result = await this.employers.update({ employerId }, { profilePictureUrl: url });
    if (result.affected === 0) {
      throw new NotFoundException('Employer profile not found.');
    }

    return url;
  }

  private pick(dto: UpdateEmployerProfileDto): Partial<Employer> {
    const patch: Partial<Employer> = {};
    if (dto.company_name !== undefined) patch.companyName = dto.company_name ?? null;
    if (dto.company_phone !== undefined) patch.companyPhone = dto.company_phone ?? null;
    if (dto.industry !== undefined) patch.industry = dto.industry ?? null;
    if (dto.company_size !== undefined) patch.companySize = dto.company_size ?? null;
    if (dto.company_location !== undefined) patch.companyLocation = dto.company_location ?? null;
    if (dto.company_website !== undefined) patch.companyWebsite = dto.company_website ?? null;
    return patch;
  }

  private async findOrFail(employerId: number): Promise<Employer> {
    const employer = await this.employers.findOne({ where: { employerId } });
    if (!employer) throw new NotFoundException('Employer profile not found.');
    return employer;
  }
}

const toProfile = (employer: Employer): EmployerProfileDto => ({
  employer_id: employer.employerId,
  company_name: employer.companyName,
  company_phone: employer.companyPhone,
  industry: employer.industry,
  company_size: employer.companySize,
  company_location: employer.companyLocation,
  company_website: employer.companyWebsite,
  profile_picture_url: employer.profilePictureUrl,
});
