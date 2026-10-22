import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employer, Job, Skill } from '../../database/entities';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

/** Read-only, unauthenticated job catalogue. Exports nothing: it is a leaf. */
@Module({
  imports: [TypeOrmModule.forFeature([Job, Employer, Skill])],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
