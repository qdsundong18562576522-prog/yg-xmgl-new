import { IsNumber, IsOptional, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class InquiryGroupExtraItemDto {
  @IsString()
  name!: string;

  @IsNumber()
  amount!: number;
}

class InquiryGroupDto {
  @IsString()
  label!: string;

  @IsString()
  supplierName!: string;

  @IsArray()
  @IsNumber({}, { each: true })
  itemIds!: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  purchasePrices?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InquiryGroupExtraItemDto)
  extraItems?: InquiryGroupExtraItemDto[];

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreateInquiryOrderDto {
  @IsNumber()
  prId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InquiryGroupDto)
  groups!: InquiryGroupDto[];
}

export class UpdateInquiryOrderDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InquiryGroupDto)
  groups?: InquiryGroupDto[];
}
