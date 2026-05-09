import { IsNumber, IsOptional, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class InquiryExtraItemDto {
  @IsString()
  name!: string;

  @IsNumber()
  amount!: number;

  // Internal: mapped to storage fields
  @IsOptional()
  materialLibId?: number;
  brand?: string;
  spec?: string;
  unit?: string;
  quantity?: number;
  purchasePrice?: number;
}

export class CreateInquiryOrderDto {
  @IsNumber()
  prId!: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  purchasePrices?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InquiryExtraItemDto)
  extraItems?: InquiryExtraItemDto[];
}

export class UpdateInquiryOrderDto {
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  purchasePrices?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InquiryExtraItemDto)
  extraItems?: InquiryExtraItemDto[];
}
