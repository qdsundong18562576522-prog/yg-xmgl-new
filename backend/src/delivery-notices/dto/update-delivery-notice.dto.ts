import { PartialType } from '@nestjs/mapped-types';
import { CreateDeliveryNoticeDto } from './create-delivery-notice.dto';
export class UpdateDeliveryNoticeDto extends PartialType(CreateDeliveryNoticeDto) {}
