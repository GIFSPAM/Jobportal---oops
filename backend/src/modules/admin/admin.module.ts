import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminLog, Application, Employer, Job, JobSeeker, User } from '../../database/entities';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Job, AdminLog, Employer, JobSeeker, Application])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
