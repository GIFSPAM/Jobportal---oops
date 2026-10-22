import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/domain.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ApiResult } from '../../common/interfaces/api-response.interface';
import { AdminService } from './admin.service';
import { AdminJobsQueryDto, UpdateUserStatusDto } from './dto/admin.dto';

@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  async stats(): Promise<ApiResult<unknown>> {
    return ApiResult.withData(await this.admin.stats());
  }

  @Get('employers')
  async employers(): Promise<ApiResult<unknown>> {
    const data = await this.admin.listEmployers();
    return ApiResult.withCount(data, data.length);
  }

  @Get('seekers')
  async seekers(): Promise<ApiResult<unknown>> {
    const data = await this.admin.listSeekers();
    return ApiResult.withCount(data, data.length);
  }

  @Get('users')
  async users(): Promise<ApiResult<unknown>> {
    const data = await this.admin.listUsers();
    return ApiResult.withCount(data, data.length);
  }

  @Get('users/:user_id')
  async user(@Param('user_id', ParseIntPipe) userId: number): Promise<ApiResult<unknown>> {
    return ApiResult.withData(await this.admin.getUser(userId));
  }

  @Patch('users/:user_id/status')
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('user_id', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<ApiResult<never>> {
    await this.admin.updateUserStatus(user.userId, userId, dto.is_active);
    return ApiResult.withMessage('User status updated.');
  }

  @Delete('users/:user_id')
  async deleteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('user_id', ParseIntPipe) userId: number,
  ): Promise<ApiResult<never>> {
    await this.admin.deleteUser(user.userId, userId);
    return ApiResult.withMessage('User deleted successfully.');
  }

  @Delete('jobs/:job_id')
  async deleteJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('job_id', ParseIntPipe) jobId: number,
  ): Promise<ApiResult<never>> {
    await this.admin.deleteJob(user.userId, jobId);
    return ApiResult.withMessage('Job deleted successfully.');
  }

  @Patch('verify-job/:job_id')
  async verify(
    @CurrentUser() user: AuthenticatedUser,
    @Param('job_id', ParseIntPipe) jobId: number,
  ): Promise<ApiResult<never>> {
    await this.admin.verifyJob(user.userId, jobId);
    return ApiResult.withMessage('Job verified successfully.');
  }

  @Patch('unverify-job/:job_id')
  async unverify(
    @CurrentUser() user: AuthenticatedUser,
    @Param('job_id', ParseIntPipe) jobId: number,
  ): Promise<ApiResult<never>> {
    await this.admin.unverifyJob(user.userId, jobId);
    return ApiResult.withMessage('Job unverified.');
  }

  @Get('all-jobs')
  async jobs(@Query() query: AdminJobsQueryDto): Promise<ApiResult<unknown>> {
    const { data, count } = await this.admin.listJobs(query);
    return ApiResult.withCount(data, count);
  }

  @Get('logs')
  async logs(): Promise<ApiResult<unknown>> {
    return ApiResult.withData(await this.admin.listLogs());
  }
}
