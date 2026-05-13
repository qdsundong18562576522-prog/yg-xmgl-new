import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PaymentRequestsService } from './payment-requests.service';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/types';

@Controller('payment-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentRequestsController {
  constructor(private service: PaymentRequestsService) {}
  @Get() async findAll(@Query('projectId') projectId?: string) { return this.service.findAll(projectId ? parseInt(projectId) : undefined); }
  @Post('remaining') async getRemaining(@Body() body: { contractType: string; contractId: number }) { return this.service.getRemaining(body.contractType, body.contractId); }
  @Get(':id') async findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Post() async create(@Body() dto: CreatePaymentRequestDto, @CurrentUser() user: any) { return this.service.create(dto, user.userId); }
  @Post(':id/submit') async submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) { return this.service.submit(id, user.userId, user.role); }
  @Post(':id/withdraw') async withdraw(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) { return this.service.withdraw(id, user.userId, user.role); }
  @Post(':id/approve-leader') @Roles(UserRole.leader, UserRole.admin) async approveLeader(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) { return this.service.approveLeader(id, user.userId); }
  @Post(':id/approve-finance') @Roles(UserRole.finance, UserRole.admin) async approveFinance(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) { return this.service.approveFinance(id, user.userId); }
  @Post(':id/reject') async reject(@Param('id', ParseIntPipe) id: number, @Body() body: any, @CurrentUser() user: any) { return this.service.reject(id, user.userId, body.comment); }
  @Post(':id/confirm-pay') async confirmPay(@Param('id', ParseIntPipe) id: number, @Body() body: any, @CurrentUser() user: any) { return this.service.confirmPay(id, user.userId, body); }
  @Delete(':id') async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) { return this.service.delete(id, user.userId, user.role); }
}
