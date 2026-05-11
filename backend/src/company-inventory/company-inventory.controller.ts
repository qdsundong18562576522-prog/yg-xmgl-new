import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CompanyInventoryService } from './company-inventory.service';
import { CreateCompanyInventoryDto } from './dto/create-company-inventory.dto';
import { UpdateCompanyInventoryDto } from './dto/update-company-inventory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/types';

@Controller('company-inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyInventoryController {
  constructor(private service: CompanyInventoryService) {}

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.purchaser, UserRole.admin)
  async create(@Body() dto: CreateCompanyInventoryDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.purchaser, UserRole.admin)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompanyInventoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }

  @Get(':id/logs')
  async findAllLogs(@Param('id', ParseIntPipe) id: number) {
    return this.service.findAllLogs(id);
  }
}
