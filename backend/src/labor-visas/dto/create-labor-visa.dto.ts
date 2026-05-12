import { IsNumber, IsString, IsOptional } from 'class-validator';
export class CreateLaborVisaDto {
  @IsNumber() laborContractId!: number;
  @IsString() reasonCalc!: string;
  @IsNumber() amountChange!: number;
  @IsOptional() @IsString() description?: string;
}
