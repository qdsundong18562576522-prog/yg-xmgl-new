import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, IsArray } from 'class-validator';

export enum ProjectTypeDto {
  integration = 'integration',
  supply = 'supply',
}

export class CreateProjectDto {
  @IsString()
  name!: string;

  @IsEnum(ProjectTypeDto)
  type!: ProjectTypeDto;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  contractAmount!: number;

  @IsNumber()
  @IsOptional()
  expectedProfitRate?: number;

  @IsNumber()
  projectManagerId!: number;

  @IsDateString()
  planStartDate!: string;

  @IsDateString()
  planEndDate!: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  salesMemberIds?: number[];

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  participantMemberIds?: number[];
}
