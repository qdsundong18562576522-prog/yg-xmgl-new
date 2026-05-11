import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyInventoryDto } from './create-company-inventory.dto';
export class UpdateCompanyInventoryDto extends PartialType(CreateCompanyInventoryDto) {}
