import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePurchaseConfirmDto {
  @IsNumber()
  inquiryId!: number;

  @IsOptional()
  @IsString()
  deliveryPaymentTerms?: string;

  @IsOptional()
  @IsString()
  supplyCycle?: string;

  @IsOptional()
  @IsString()
  contractFile?: string;
}
