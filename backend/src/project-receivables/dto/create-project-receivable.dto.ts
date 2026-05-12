import { IsNumber, IsString, IsOptional, Min, IsDateString } from 'class-validator';
export class CreateProjectReceivableDto {
  @IsNumber() projectId!: number;
  @IsNumber() @Min(0) amount!: number;
  @IsString() method!: string;
  @IsOptional() @IsDateString() receivedTime?: string;
}
