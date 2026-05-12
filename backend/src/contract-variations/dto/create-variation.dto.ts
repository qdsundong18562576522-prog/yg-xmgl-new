import { IsNumber, IsString, IsOptional, IsArray } from 'class-validator';

class VariationItemDto {
  @IsString() name!: string;
  @IsString() spec!: string;
  @IsString() unit!: string;
  @IsNumber() quantity!: number; // 工程量，可正可负
  @IsNumber() contractPrice!: number; // 综合单价
}

export class CreateVariationDto {
  @IsNumber() projectId!: number;
  @IsArray() items!: VariationItemDto[];
  @IsOptional() @IsString() reason?: string;
}
