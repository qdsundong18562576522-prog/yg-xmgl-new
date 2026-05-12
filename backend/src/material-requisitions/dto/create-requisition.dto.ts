import { IsNumber, IsArray, IsOptional, IsString, Min } from 'class-validator';

class RequisitionItemDto {
  @IsNumber()
  materialLibId!: number;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  costPrice!: number;

  @IsNumber()
  @Min(0)
  contractPrice!: number;
}

export class CreateRequisitionDto {
  @IsNumber()
  projectId!: number;

  @IsArray()
  items!: RequisitionItemDto[];

  @IsOptional() @IsString() deliveryMethod?: string;
  @IsOptional() @IsString() receiver?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
}
