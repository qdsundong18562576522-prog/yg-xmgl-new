import { IsNumber, IsString, IsOptional, Min, IsArray } from 'class-validator';

export class ContractItem {
  @IsString() contractLabel!: string;
  @IsString() supplierName!: string;
  @IsNumber() @Min(0) amount!: number;
}

export class CreatePaymentRequestDto {
  @IsNumber() projectId!: number;
  @IsString() contractType!: string;
  @IsNumber() contractId!: number;
  @IsOptional() @IsArray() contractData?: ContractItem[];
  @IsOptional() @IsString() paymentTerms?: string;
  @IsString() reason!: string;
  @IsNumber() @Min(0) amount!: number;
}
