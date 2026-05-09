import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseRequestItemDto {
  @IsOptional()
  @IsNumber()
  materialLibId?: number;

  @IsString()
  name!: string;

  @IsString()
  brand!: string;

  @IsString()
  spec!: string;

  @IsString()
  unit!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  contractPrice!: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreatePurchaseRequestDto {
  @IsNumber()
  projectId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestItemDto)
  items!: PurchaseRequestItemDto[];

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @IsNumber()
  receiverId?: number;

  @IsOptional()
  @IsString()
  phone?: string;
}
