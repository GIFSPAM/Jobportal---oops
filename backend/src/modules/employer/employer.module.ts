import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Application,
  Employer,
  Job,
  JobSkill,
  SeekerSkill,
  Skill,
} from '../../database/entities';
import { StorageModule } from '../storage/storage.module';
import { EmployerApplicantService } from './employer-applicant.service';
import { EmployerController } from './employer.controller';
import { EmployerJobService } from './employer-job.service';
import { EmployerProfileService } from './employer-profile.service';
import { EmployerStatsService } from './employer-stats.service';

/** Hiring side of the marketplace. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Job, JobSkill, Employer, Application, SeekerSkill, Skill]),
    StorageModule,
  ],
  controllers: [EmployerController],
  providers: [
    EmployerStatsService,
    EmployerJobService,
    EmployerApplicantService,
    EmployerProfileService,
  ],
})
export class EmployerModule {}
