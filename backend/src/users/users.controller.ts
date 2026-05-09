import { Controller, Get, Post, Put, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/types';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.admin)
  async findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles(UserRole.admin)
  async create(@Body() body: {
    username: string; password: string; displayName: string;
    role: string; department?: string; phone?: string;
  }) {
    return this.usersService.create(body);
  }

  @Put(':id')
  @Roles(UserRole.admin)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      displayName?: string; role?: string; department?: string;
      phone?: string; isActive?: boolean;
    },
  ) {
    return this.usersService.update(id, body);
  }
}
