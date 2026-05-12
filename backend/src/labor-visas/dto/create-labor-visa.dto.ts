import { IsNumber, IsString } from 'class-validator';
export class CreateLaborVisaDto {
  @IsNumber() laborContractId!: number;
  @IsString() reasonCalc!: string;
  @IsNumber() amountChange!: number;
}
