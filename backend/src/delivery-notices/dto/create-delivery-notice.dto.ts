import { IsNumber, IsOptional, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class DeliveryContractItemDto {
  @IsString()
  contractLabel!: string;

  @IsString()
  supplierName!: string;

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  deliveryOption?: string;

  @IsOptional()
  @IsString()
  transportMethod?: string;


  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreateDeliveryNoticeDto {
  @IsNumber()
  confirmId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryContractItemDto)
  contracts!: DeliveryContractItemDto[];

  @IsOptional()
  @IsString()
  totalDate?: string;

  @IsOptional()
  @IsString()
  receiver?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateDeliveryNoticeDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryContractItemDto)
  contracts?: DeliveryContractItemDto[];

  @IsOptional()
  @IsString()
  totalDate?: string;

  @IsOptional()
  @IsString()
  receiver?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
