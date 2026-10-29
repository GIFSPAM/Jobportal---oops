import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { BadRequestError, ForbiddenError, UnauthorizedError, ConflictError } from '../../common/exceptions/domain.exceptions';
import { UserRole } from '../../common/enums/domain.enum';
import { ApiResult } from '../../common/interfaces/api-response.interface';
import { Employer, JobSeeker, User } from '../../database/entities';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { toAuthResponse, type AuthResponse } from './mappers/auth.mapper';

interface JwtPayload {
  user_id: number;
  role: UserRole;
  email: string;
}

/** Registration, login and token issuance. */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<ApiResult<AuthResponse>> {
    this.assertRoleRequirements(dto);

    const adminSecret = this.config.get<string>('security.adminSecret');
    if (dto.role === UserRole.ADMIN && dto.secretKey !== adminSecret) {
      throw new ForbiddenError('Invalid admin secret.');
    }

    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictError('Email already registered.');
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      this.config.get<number>('security.bcryptRounds') ?? 10,
    );

    let created: User;

    try {
      created = await this.dataSource.transaction(async (manager) => {
        const user = await manager.save(User, {
          email: dto.email,
          passwordHash,
          role: dto.role,
          isActive: true,
        });

        if (dto.role === UserRole.JOBSEEKER) {
          await manager.insert(JobSeeker, {
            seekerId: user.userId,
            fullName: dto.full_name ?? null,
            phoneNumber: dto.phone_number ?? null,
            education: dto.education ?? null,
            experienceYears: dto.experience_years ?? null,
          });
        }

        if (dto.role === UserRole.EMPLOYER) {
          await manager.insert(Employer, {
            employerId: user.userId,
            companyName: dto.company_name ?? null,
            crn: dto.crn ? dto.crn.trim().toUpperCase() : null,
            companyPhone: dto.company_phone ?? null,
            industry: dto.industry ?? null,
            companySize: dto.company_size ?? null,
            companyLocation: dto.company_location ?? null,
            companyWebsite: dto.company_website ?? null,
          });
        }

        return user;
      });
    } catch (error) {
      // 1062 = duplicate key: another request registered the same email
      // between our pre-check and the insert.
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError('Email already exists.');
      }
      this.logger.error(`Registration failed for ${dto.email}`, (error as Error).stack);
      throw error;
    }

    return ApiResult.withData(await this.toResponse(created));
  }

  async login(dto: LoginDto): Promise<ApiResult<AuthResponse>> {
    const user = await this.users.findOne({
      where: { email: dto.email },
      select: ['userId', 'email', 'passwordHash', 'role', 'isActive', 'createdAt'],
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials.');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account is deactivated. Contact admin.');
    }

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedError('Invalid credentials.');
    }

    return ApiResult.withData(await this.toResponse(user));
  }

  /** Issues the bearer token. Payload shape is part of the client contract. */
  async signToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      user_id: user.userId,
      role: user.role,
      email: user.email,
    };
    return this.jwtService.signAsync(payload);
  }

  private async toResponse(user: User): Promise<AuthResponse> {
    return toAuthResponse(user, await this.signToken(user));
  }

  /** The three roles form a discriminated union: each requires its own set of profile fields. */
  private assertRoleRequirements(dto: RegisterDto): void {
    const missing: string[] = [];

    if (dto.role === UserRole.JOBSEEKER && !dto.full_name?.trim()) {
      missing.push('full_name');
    }

    if (dto.role === UserRole.EMPLOYER && !dto.company_name?.trim()) {
      missing.push('company_name');
    }

    if (missing.length > 0) {
      throw new BadRequestError(
        `Missing required fields for ${dto.role}: ${missing.join(', ')}.`,
      );
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    const code = (error as { errno?: number; code?: string })?.errno;
    return code === 1062 || (error as { code?: string })?.code === 'ER_DUP_ENTRY';
  }
}
