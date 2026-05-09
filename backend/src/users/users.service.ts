import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true, username: true, displayName: true,
        role: true, department: true, phone: true,
        isActive: true, createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(data: {
    username: string; password: string; displayName: string;
    role: string; department?: string; phone?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { username: data.username } });
    if (existing) throw new ConflictException('用户名已存在');

    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        displayName: data.displayName,
        role: data.role as any,
        department: data.department,
        phone: data.phone,
      },
      select: {
        id: true, username: true, displayName: true,
        role: true, department: true, phone: true, createdAt: true,
      },
    });
  }

  async update(id: number, data: {
    displayName?: string; role?: string; department?: string;
    phone?: string; isActive?: boolean;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.displayName && { displayName: data.displayName }),
        ...(data.role && { role: data.role as any }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: {
        id: true, username: true, displayName: true,
        role: true, department: true, phone: true, isActive: true, createdAt: true,
      },
    });
  }

  async delete(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.role === 'admin') throw new BadRequestException('不能删除管理员账号');
    await this.prisma.user.delete({ where: { id } });
    return { id, deleted: true };
  }
}
