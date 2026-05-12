import { IsNumber, IsString, IsOptional, Min, IsBoolean } from 'class-validator';
export class CreateReimbursementDto {
  @IsNumber() projectId!: number;
  @IsString() reason!: string;
  @IsNumber() @Min(0) amount!: number;
  @IsBoolean() hasInvoice!: boolean;
  @IsOptional() @IsString() invoiceFile?: string;
  @IsOptional() @IsString() noInvoiceReason?: string;
}
