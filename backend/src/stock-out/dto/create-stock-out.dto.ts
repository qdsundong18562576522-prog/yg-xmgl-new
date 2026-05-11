import { IsString, IsNumber, IsArray, IsOptional, Min, IsEnum } from 'class-validator';

export enum StockOutReasonDto {
  design_change = 'design_change',
  solution_optimization = 'solution_optimization',
  procurement_error = 'procurement_error',
  other = 'other',
}

class StockOutItemDto {
  @IsNumber()
  materialLibId!: number;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  costPrice!: number;
}

export class CreateStockOutDto {
  @IsNumber()
  projectId!: number;

  @IsEnum(StockOutReasonDto)
  reasonType!: StockOutReasonDto;

  @IsOptional()
  @IsString()
  reasonDetail?: string;

  @IsArray()
  items!: StockOutItemDto[];
}
