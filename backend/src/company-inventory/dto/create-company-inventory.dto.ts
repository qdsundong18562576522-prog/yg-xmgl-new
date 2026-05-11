import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateCompanyInventoryDto {
  @IsNumber()
  materialLibId!: number;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  costPrice!: number;

  @IsOptional()
  @IsString()
  remark?: string;
}
