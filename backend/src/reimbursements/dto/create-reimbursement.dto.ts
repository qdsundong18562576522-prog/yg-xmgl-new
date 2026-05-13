import { IsNumber, IsString, IsOptional, Min, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
export class CreateReimbursementDto {
  @IsNumber() projectId!: number;
  @IsString() reason!: string;
  @IsNumber() @Min(0) amount!: number;
  @Transform(({ value }) => value === true || value === 'true' || value === 'yes')
  @IsBoolean() hasInvoice!: boolean;
  @IsOptional() @IsString() invoiceFile?: string;
  @IsOptional() @IsString() noInvoiceReason?: string;
}
