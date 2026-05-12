import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { LaborVisasService } from './labor-visas.service';
import { CreateLaborVisaDto } from './dto/create-labor-visa.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/types';

@Controller('labor-visas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LaborVisasController {
  constructor(private service: LaborVisasService) {}
  @Get() async findAll(@Query('laborContractId') laborContractId?: string) { return this.service.findAll(laborContractId ? parseInt(laborContractId) : undefined); }
  @Get(':id') async findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Post() async create(@Body() dto: CreateLaborVisaDto, @CurrentUser() user: any) { return this.service.create(dto, user.userId); }
  @Post(':id/submit') async submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) { return this.service.submit(id, user.userId, user.role); }
  @Post(':id/approve') @Roles(UserRole.leader, UserRole.admin) async approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) { return this.service.approve(id, user.userId); }
  @Post(':id/withdraw') async withdraw(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) { return this.service.withdraw(id, user.userId, user.role); }
  @Post(':id/reject') async reject(@Param('id', ParseIntPipe) id: number, @Body() body: any, @CurrentUser() user: any) { return this.service.reject(id, user.userId, body.comment); }
}
