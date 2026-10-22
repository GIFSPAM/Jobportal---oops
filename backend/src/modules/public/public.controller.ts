import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { ApiResult } from '../../common/interfaces/api-response.interface';
import { PublicJobsQueryDto, SkillSearchQueryDto } from './dto/public-jobs-query.dto';
import { PublicService } from './public.service';

/** Unauthenticated catalogue endpoints. */
@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('jobs')
  async findJobs(@Query() query: PublicJobsQueryDto): Promise<ApiResult<unknown>> {
    const { data, count } = await this.publicService.findJobs(query);
    return ApiResult.withCount(data, count);
  }

  /** Home-page carousel: same feed, capped at six most recent openings. */
  @Get('landing-jobs')
  async findLandingJobs(@Query() query: PublicJobsQueryDto): Promise<ApiResult<unknown>> {
    const { data, count } = await this.publicService.findJobs(query, 6);
    return ApiResult.withCount(data, count);
  }

  @Get('jobs/:job_id')
  async findJobById(@Param('job_id', ParseIntPipe) jobId: number): Promise<ApiResult<unknown>> {
    return ApiResult.withData(await this.publicService.findJobById(jobId));
  }

  @Get('skills')
  async findSkills(@Query() query: SkillSearchQueryDto): Promise<ApiResult<unknown>> {
    const skills = await this.publicService.findSkills(query.search);
    return ApiResult.withCount(skills, skills.length);
  }
}
