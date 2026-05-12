import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
export class CreateLaborContractDto {
  @IsNumber() projectId!: number;
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() contractFile?: string;
}
