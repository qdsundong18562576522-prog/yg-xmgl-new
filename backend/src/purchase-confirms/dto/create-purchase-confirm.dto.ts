import { IsNumber, IsOptional, IsArray, ValidateNested, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseConfirmGroupDto {
  @IsString()
  supplierName!: string;

  @IsNumber()
  @Min(0)
  contractAmount!: number;

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

export class CreatePurchaseConfirmDto {
  @IsNumber()
  inquiryId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseConfirmGroupDto)
  groups!: PurchaseConfirmGroupDto[];
}
