import { Controller, Get, Param, ParseIntPipe, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ForbiddenError,
  NotFoundError,
} from '../../common/exceptions/domain.exceptions';
import { UserRole } from '../../common/enums/domain.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Application } from '../../database/entities';
import { Repository } from 'typeorm';
import { ResumeStorage } from './resume-storage.service';

/** Cross-role resume download. */
@Controller('auth')
export class ResumeDownloadController {
  constructor(
    @InjectRepository(Application) private readonly applications: Repository<Application>,
    private readonly resumeStorage: ResumeStorage,
  ) {}

  @Get('resume-download/:application_id')
  async download(
    @Param('application_id', ParseIntPipe) applicationId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ): Promise<void> {
    const application = await this.applications
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.job', 'job')
      .innerJoinAndSelect('a.seeker', 'seeker')
      .where('a.application_id = :applicationId', { applicationId })
      .getOne();

    const resumePath = application?.seeker?.resumePath;
    if (!application || !resumePath) {
      throw new NotFoundError('Resume not found.');
    }

    this.assertMayRead(application, user);

    const absolutePath = this.resumeStorage.resolve(resumePath);
    const fallback = `resume-${application.seeker.seekerId}.pdf`;
    const filename =
      application.seeker.resumeFilename || this.resumeStorage.downloadName(resumePath, fallback);

    await this.resumeStorage.stream(absolutePath, filename, response);
  }

  private assertMayRead(application: Application, user: AuthenticatedUser): void {
    const isOwningEmployer =
      user.role === UserRole.EMPLOYER && application.job.employerId === user.userId;

    const isOwningSeeker =
      user.role === UserRole.JOBSEEKER && application.seeker.seekerId === user.userId;

    if (!isOwningEmployer && !isOwningSeeker) {
      throw new ForbiddenError('Not authorized to download this resume.');
    }
  }
}

