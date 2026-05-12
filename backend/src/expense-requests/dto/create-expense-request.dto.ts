import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
export class CreateExpenseRequestDto {
  @IsNumber() projectId!: number;
  @IsString() reason!: string;
  @IsNumber() @Min(0) amount!: number;
  @IsString() payMethod!: string;
  @IsOptional() @IsString() otherMethod?: string;
}
