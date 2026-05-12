import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ReimbursementsService } from './reimbursements.service';
import { CreateReimbursementDto } from './dto/create-reimbursement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/types';

@Controller('reimbursements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReimbursementsController {
  constructor(private service: ReimbursementsService) {}

  @Get() async findAll(@Query('projectId') projectId?: string) { return this.service.findAll(projectId ? parseInt(projectId) : undefined); }
  @Get(':id') async findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Post() async create(@Body() dto: CreateReimbursementDto, @CurrentUser() user: any) { return this.service.create(dto, user.userId, user.role); }
  @Post(':id/submit') async submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) { return this.service.submit(id, user.userId, user.role); }
  @Post(':id/approve-pm') @Roles(UserRole.pm, UserRole.admin) async approvePm(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) { return this.service.approvePm(id, user.userId); }
  @Post(':id/approve-leader') @Roles(UserRole.leader, UserRole.admin) async approveLeader(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) { return this.service.approveLeader(id, user.userId); }
  @Post(':id/approve-finance') @Roles(UserRole.finance, UserRole.admin) async approveFinance(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) { return this.service.approveFinance(id, user.userId); }
  @Post(':id/reject') async reject(@Param('id', ParseIntPipe) id: number, @Body() body: any, @CurrentUser() user: any) { return this.service.reject(id, user.userId, body.comment); }
}
