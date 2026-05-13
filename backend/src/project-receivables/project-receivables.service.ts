import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectReceivableDto } from './dto/create-project-receivable.dto';

@Injectable()
export class ProjectReceivablesService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId?: number) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    return this.prisma.projectReceivable.findMany({
      where,
      include: { project: { select: { id: true, name: true, code: true } }, createdBy: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const r = await this.prisma.projectReceivable.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true, code: true } }, createdBy: { select: { id: true, displayName: true } } },
    });
    if (!r) throw new NotFoundException('回款记录不存在');
    return r;
  }

  async create(dto: CreateProjectReceivableDto, userId: number) {
    return this.prisma.projectReceivable.create({
      data: {
        projectId: dto.projectId,
        amount: dto.amount,
        method: dto.method,
        receivedTime: dto.receivedTime ? new Date(dto.receivedTime) : new Date(),
        createdById: userId,
      },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async delete(id: number, userId: number, role: string) {
    const r = await this.prisma.projectReceivable.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('回款记录不存在');
    if (role !== 'admin' && r.createdById !== userId) throw new ForbiddenException('无权删除');

    await this.prisma.projectReceivable.delete({ where: { id } });
    return { id, deleted: true };
  }
}
