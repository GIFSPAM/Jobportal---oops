import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/domain.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ApiResult } from '../../common/interfaces/api-response.interface';
import { IMAGE_UPLOAD_OPTIONS, RESUME_UPLOAD_OPTIONS } from '../storage/upload.options';
import { ResumeStorage } from '../storage/resume-storage.service';
import { UpdateSeekerProfileDto, UpdateSkillsDto } from './dto/seeker.dto';
import { SeekerApplicationService } from './seeker-application.service';
import { SeekerProfileService } from './seeker-profile.service';
import { SeekerSavedJobService } from './seeker-saved-job.service';
import { SeekerStatsService } from './seeker-stats.service';

/** Job seeker controller for profile, application, and matching endpoints. */
@Roles(UserRole.JOBSEEKER)
@Controller('seeker')
export class SeekerController {
  constructor(
    private readonly stats: SeekerStatsService,
    private readonly applications: SeekerApplicationService,
    private readonly savedJobs: SeekerSavedJobService,
    private readonly profile: SeekerProfileService,
    private readonly resumeStorage: ResumeStorage,
  ) {}

  // --- dashboard ----------------------------------------------------------

  @Get('stats')
  findStats(@CurrentUser() user: AuthenticatedUser): Promise<ApiResult<unknown>> {
    return this.stats.stats(user.userId).then((data) => ApiResult.withData(data));
  }

  // --- applications -------------------------------------------------------

  @Post('apply/:job_id')
  async apply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('job_id', ParseIntPipe) jobId: number,
  ): Promise<ApiResult<unknown>> {
    const payload = await this.applications.apply(user.userId, jobId);
    return ApiResult.withData(payload, { message: 'Application submitted successfully!' });
  }

  @Get('my-applications')
  async listApplications(@CurrentUser() user: AuthenticatedUser): Promise<ApiResult<unknown>> {
    const { data, count } = await this.applications.list(user.userId);
    return ApiResult.withCount(data, count);
  }

  @Delete('revoke/:application_id')
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('application_id', ParseIntPipe) applicationId: number,
  ): Promise<ApiResult<never>> {
    await this.applications.revoke(user.userId, applicationId);
    return ApiResult.withMessage('Application revoked.');
  }

  @Get('job-match/:job_id')
  async match(
    @CurrentUser() user: AuthenticatedUser,
    @Param('job_id', ParseIntPipe) jobId: number,
  ): Promise<ApiResult<unknown>> {
    const match = await this.applications.jobMatch(user.userId, jobId);
    return ApiResult.withData(match);
  }

  // --- saved jobs ---------------------------------------------------------

  @Post('saved-jobs/:job_id')
  @HttpCode(HttpStatus.CREATED)
  async saveJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('job_id', ParseIntPipe) jobId: number,
  ): Promise<ApiResult<never>> {
    await this.savedJobs.save(user.userId, jobId);
    return ApiResult.withMessage('Job saved successfully.');
  }

  @Get('saved-jobs')
  async listSavedJobs(@CurrentUser() user: AuthenticatedUser): Promise<ApiResult<unknown>> {
    const { data, count } = await this.savedJobs.list(user.userId);
    return ApiResult.withCount(data, count);
  }

  @Delete('saved-jobs/:job_id')
  async removeSavedJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('job_id', ParseIntPipe) jobId: number,
  ): Promise<ApiResult<never>> {
    await this.savedJobs.remove(user.userId, jobId);
    return ApiResult.withMessage('Saved job removed successfully.');
  }

  // --- profile ------------------------------------------------------------

  @Get('profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<ApiResult<unknown>> {
    return ApiResult.withData(await this.profile.getProfile(user.userId));
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSeekerProfileDto,
  ): Promise<ApiResult<never>> {
    await this.profile.updateProfile(user.userId, dto);
    return ApiResult.withMessage('Profile updated successfully.');
  }

  @Put('skills')
  async updateSkills(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSkillsDto,
  ): Promise<ApiResult<never>> {
    await this.profile.updateSkills(user.userId, dto);
    return ApiResult.withMessage('Skills updated.');
  }

  @Post('photo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', IMAGE_UPLOAD_OPTIONS))
  async uploadPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApiResult<never>> {
    await this.profile.updatePhoto(user.userId, file);
    return ApiResult.withMessage('Photo updated successfully.');
  }

  // --- resume -------------------------------------------------------------

  @Put('profile/resume')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('resume', RESUME_UPLOAD_OPTIONS))
  async uploadResume(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApiResult<unknown>> {
    const stored = await this.profile.updateResume(user.userId, file);
    return ApiResult.withData(stored, { message: 'Resume updated successfully!' });
  }

  @Get('profile/resume/download')
  async downloadOwnResume(
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ): Promise<void> {
    const { absolutePath, filename } = await this.profile.getResume(user.userId);
    await this.resumeStorage.stream(absolutePath, filename, response);
  }

  // --- job context --------------------------------------------------------

  @Get('jobs/employer/:job_id')
  async employerOfJob(
    @Param('job_id', ParseIntPipe) jobId: number,
  ): Promise<ApiResult<unknown>> {
    return ApiResult.withData(await this.applications.findEmployerOfJob(jobId));
  }
}
