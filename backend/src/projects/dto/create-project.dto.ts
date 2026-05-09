import { IsString, IsEnum, IsNumber, IsOptional, IsDateString } from 'class-validator';

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
}
