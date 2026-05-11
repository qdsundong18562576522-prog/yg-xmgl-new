import { IsNumber, IsArray, IsOptional, Min } from 'class-validator';

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
}
