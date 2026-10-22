import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { SkillProficiency } from '../../../common/enums/domain.enum';

/** One entry of the seeker's full-replacement skill list. */
export class SkillInputDto {
  @IsString({ message: 'Skill name is required.' })
  @Length(1, 50, { message: 'Skill name must be between 1 and 50 characters.' })
  name!: string;

  @IsOptional()
  @IsEnum(SkillProficiency, {
    message: 'proficiency must be one of: beginner, intermediate, advanced.',
  })
  proficiency?: SkillProficiency;
}

/** `PUT /seeker/skills`. */
export class UpdateSkillsDto {
  @IsArray({ message: 'Skills must be an array of objects.' })
  @ArrayNotEmpty({ message: 'Skills must contain at least one entry.' })
  @ValidateNested({ each: true })
  @Type(() => SkillInputDto)
  skills!: SkillInputDto[];
}

/** `PUT /seeker/profile`. */
export class UpdateSeekerProfileDto {
  @IsOptional()
  @IsString()
  @Length(0, 100)
  full_name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  phone_number?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  education?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  experience_years?: number;
}
