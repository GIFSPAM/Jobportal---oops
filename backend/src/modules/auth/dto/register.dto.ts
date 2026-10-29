import { IsEnum, IsEmail, IsInt, IsOptional, IsString, Length, Matches, Min, MinLength } from 'class-validator';
import { CompanySize, UserRole } from '../../../common/enums/domain.enum';

/** Registration payload. */
export class RegisterDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  email!: string;

  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  password!: string;

  @IsEnum(UserRole, { message: 'role must be one of: jobseeker, employer, admin.' })
  role!: UserRole;

  /** Required only when `role === admin`. */
  @IsOptional()
  @IsString()
  secretKey?: string;

  // --- job seeker profile -------------------------------------------------
  @IsOptional() @IsString() @Length(0, 100)
  full_name?: string;

  @IsOptional() @IsString() @Length(0, 20)
  phone_number?: string;

  @IsOptional() @IsString() @Length(0, 100)
  education?: string;

  @IsOptional() @IsInt() @Min(0)
  experience_years?: number;

  // --- employer profile ---------------------------------------------------
  @IsOptional() @IsString() @Length(0, 100)
  company_name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9\-]{5,30}$/, {
    message: 'crn must be a valid Company Registration Number format (5-30 alphanumeric characters, e.g. CRN-12345678).',
  })
  crn?: string;

  @IsOptional() @IsString() @Length(0, 100)
  industry?: string;

  @IsOptional() @IsEnum(CompanySize)
  company_size?: CompanySize;

  @IsOptional() @IsString() @Length(0, 100)
  company_location?: string;

  @IsOptional() @IsString() @Length(0, 150)
  company_website?: string;

  @IsOptional() @IsString() @Length(0, 20)
  company_phone?: string;
}
