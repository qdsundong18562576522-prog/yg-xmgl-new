import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseConfirmDto } from './create-purchase-confirm.dto';
export class UpdatePurchaseConfirmDto extends PartialType(CreatePurchaseConfirmDto) {}
