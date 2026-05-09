import { PartialType } from '@nestjs/mapped-types';
import { CreateInquiryOrderDto } from './create-inquiry-order.dto';
export class UpdateInquiryOrderDto extends PartialType(CreateInquiryOrderDto) {}
