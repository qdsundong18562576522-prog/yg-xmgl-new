import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
export class CreateLaborContractDto {
  @IsNumber() projectId!: number;
  @IsOptional() @IsString() contractorName?: string;
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() contractFile?: string;
}
