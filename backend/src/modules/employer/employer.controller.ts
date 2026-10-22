import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/domain.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ApiResult } from '../../common/interfaces/api-response.interface';
import { IMAGE_UPLOAD_OPTIONS } from '../storage/upload.options';
import {
  ApplicantQueryDto,
  CreateJobDto,
  UpdateApplicationStatusDto,
  UpdateEmployerProfileDto,
  UpdateJobDto,
  UpdateJobStatusDto,
} from './dto/employer.dto';
import { EmployerApplicantService } from './employer-applicant.service';
import { EmployerJobService } from './employer-job.service';
import { EmployerProfileService } from './employer-profile.service';
import { EmployerStatsService } from './employer-stats.service';

/** Employer surface. */
@Roles(UserRole.EMPLOYER)
@Controller('employer')
export class EmployerController {
  constructor(
    private readonly stats: EmployerStatsService,
    private readonly jobs: EmployerJobService,
    private readonly applicants: EmployerApplicantService,
    private readonly profile: EmployerProfileService,
  ) {}

  // --- dashboard ----------------------------------------------------------

  @Get('stats')
  async statsFor(@CurrentUser() user: AuthenticatedUser): Promise<ApiResult<unknown>> {
    return ApiResult.withData(await this.stats.stats(user.userId));
  }

  // --- postings -----------------------------------------------------------

  @Post('post')
  @HttpCode(HttpStatus.CREATED)
  async createJob(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJobDto,
  ): Promise<ApiResult<unknown>> {
    const jobId = await this.jobs.create(user.userId, dto);
    return ApiResult.withData({ job_id: jobId }, { message: 'Job posted successfully!' });
  }

  @Get('my-jobs')
  async listMyJobs(@CurrentUser() user: AuthenticatedUser): Promise<ApiResult<unknown>> {
    const { data, count } = await this.jobs.listMine(user.userId);
    return ApiResult.withCount(data, count);
  }

  @Put('update/:job_id')
  async updateJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('job_id', ParseIntPipe) jobId: number,
    @Body() dto: UpdateJobDto,
  ): Promise<ApiResult<never>> {
    await this.jobs.update(user.userId, jobId, dto);
    return ApiResult.withMessage('Job updated successfully!');
  }

  @Patch('status/:job_id')
  async updateJobStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('job_id', ParseIntPipe) jobId: number,
    @Body() dto: UpdateJobStatusDto,
  ): Promise<ApiResult<never>> {
    await this.jobs.updateStatus(user.userId, jobId, dto.status);
    return ApiResult.withMessage('Job status updated.');
  }

  @Delete('delete-jobs/:job_id')
  async deleteJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('job_id', ParseIntPipe) jobId: number,
  ): Promise<ApiResult<never>> {
    await this.jobs.remove(user.userId, jobId);
    return ApiResult.withMessage('Job deleted successfully.');
  }

  // --- candidates ---------------------------------------------------------

  @Get('applicants/:job_id')
  async listApplicants(
    @CurrentUser() user: AuthenticatedUser,
    @Param('job_id', ParseIntPipe) jobId: number,
    @Query() query: ApplicantQueryDto,
  ): Promise<ApiResult<unknown>> {
    const { data, count } = await this.applicants.listApplicants(user.userId, jobId, query);
    return ApiResult.withCount(data, count);
  }

  @Patch('application-status/:application_id')
  async updateApplicationStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('application_id', ParseIntPipe) applicationId: number,
    @Body() dto: UpdateApplicationStatusDto,
  ): Promise<ApiResult<never>> {
    await this.applicants.updateApplicationStatus(user.userId, applicationId, dto);
    return ApiResult.withMessage('Status updated.');
  }

  // --- company ------------------------------------------------------------

  @Get('profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<ApiResult<unknown>> {
    return ApiResult.withData(await this.profile.getProfile(user.userId));
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEmployerProfileDto,
  ): Promise<ApiResult<never>> {
    await this.profile.updateProfile(user.userId, dto);
    return ApiResult.withMessage('Employer profile updated successfully.');
  }

  @Post('logo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', IMAGE_UPLOAD_OPTIONS))
  async uploadLogo(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApiResult<never>> {
    await this.profile.updateLogo(user.userId, file);
    return ApiResult.withMessage('Logo updated successfully.');
  }
}
