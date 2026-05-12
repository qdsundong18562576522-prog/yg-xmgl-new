import { Module } from '@nestjs/common';
import { ContractVariationsController } from './contract-variations.controller';
import { ContractVariationsService } from './contract-variations.service';

@Module({
  controllers: [ContractVariationsController],
  providers: [ContractVariationsService],
  exports: [ContractVariationsService],
})
export class ContractVariationsModule {}
