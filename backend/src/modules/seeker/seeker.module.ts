import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Application,
  Employer,
  Job,
  JobSeeker,
  JobSkill,
  SavedJob,
  SeekerSkill,
  Skill,
} from '../../database/entities';
import { StorageModule } from '../storage/storage.module';
import { SeekerController } from './seeker.controller';
import { SeekerApplicationService } from './seeker-application.service';
import { SeekerProfileService } from './seeker-profile.service';
import { SeekerSavedJobService } from './seeker-saved-job.service';
import { SeekerStatsService } from './seeker-stats.service';

/** Job-seeker feature slice. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobSeeker,
      SeekerSkill,
      Skill,
      Application,
      Job,
      JobSkill,
      Employer,
      SavedJob,
    ]),
    StorageModule,
  ],
  controllers: [SeekerController],
  providers: [
    SeekerProfileService,
    SeekerApplicationService,
    SeekerSavedJobService,
    SeekerStatsService,
  ],
})
export class SeekerModule {}
