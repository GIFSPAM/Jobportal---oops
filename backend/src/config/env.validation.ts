import { plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';

/** Fail-fast environment validation. */
class EnvironmentVariables {
  @IsOptional() @IsInt() @Min(1)
  PORT?: number;

  @IsOptional() @IsString() @IsNotEmpty()
  DB_HOST?: string;

  @IsOptional() @IsInt() @Min(1) @Max(65535)
  DB_PORT?: number;

  @IsString({ message: 'DB_USER is required.' })
  DB_USER: string;

  @IsString({ message: 'DB_PASS is required.' })
  DB_PASS: string;

  @IsOptional() @IsString()
  DB_NAME?: string;

  @IsString({ message: 'JWT_SECRET is required — set it in backend/.env' })
  JWT_SECRET: string;

  @IsOptional() @IsString()
  JWT_EXPIRES_IN?: string;

  @IsString({ message: 'ADMIN_SECRET is required — set it in backend/.env' })
  ADMIN_SECRET: string;

  @IsOptional() @IsInt() @Min(4)
  BCRYPT_ROUNDS?: number;

  @IsOptional() @IsString()
  UPLOADS_DIR?: string;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((error) => `  • ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return validated;
}
