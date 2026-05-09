import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDeliveryNoticeDto {
  @IsNumber()
  confirmId!: number;

  @IsOptional()
  @IsString()
  deliveryOption?: string;

  @IsOptional()
  @IsString()
  transportMethod?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

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
