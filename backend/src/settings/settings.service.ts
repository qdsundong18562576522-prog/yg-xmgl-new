import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // ===== System Config =====

  async getAllConfigs() {
    return this.prisma.systemConfig.findMany({ orderBy: { configKey: 'asc' } });
  }

  async getConfig(key: string) {
    return this.prisma.systemConfig.findUnique({ where: { configKey: key } });
  }

  async updateConfig(key: string, value: string, userId: number) {
    return this.prisma.systemConfig.upsert({
      where: { configKey: key },
      update: { configValue: value, updatedBy: userId },
      create: { configKey: key, configValue: value, updatedBy: userId },
    });
  }

  // ===== Dictionary =====

  async getDictTypes() {
    const types = await this.prisma.dictionary.groupBy({
      by: ['dictType'],
      _count: { dictType: true },
      orderBy: { dictType: 'asc' },
    });
    return types.map((t) => ({
      dictType: t.dictType,
      count: t._count.dictType,
    }));
  }

  async getDictByType(type: string) {
    return this.prisma.dictionary.findMany({
      where: { dictType: type },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createDict(data: {
    dictType: string;
    dictLabel: string;
    dictValue: string;
    sortOrder?: number;
    remark?: string;
  }) {
    return this.prisma.dictionary.create({ data });
  }

  async updateDict(
    id: number,
    data: { dictLabel?: string; dictValue?: string; sortOrder?: number; remark?: string },
  ) {
    return this.prisma.dictionary.update({ where: { id }, data });
  }

  async deleteDict(id: number) {
    return this.prisma.dictionary.delete({ where: { id } });
  }

  async toggleDictStatus(id: number) {
    const entry = await this.prisma.dictionary.findUnique({ where: { id } });
    if (!entry) throw new Error('字典条目不存在');
    return this.prisma.dictionary.update({
      where: { id },
      data: { status: !entry.status },
    });
  }

  // ===== Operation Logs =====

  async getOperationLogs(params: {
    page?: number;
    pageSize?: number;
    entityType?: string;
    action?: string;
    userId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = {};

    if (params.entityType) where.entityType = params.entityType;
    if (params.action) where.action = params.action;
    if (params.userId) where.userId = params.userId;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where,
        include: { user: { select: { displayName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.operationLog.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async getLogEntityTypes() {
    const types = await this.prisma.operationLog.groupBy({
      by: ['entityType'],
      _count: { entityType: true },
      orderBy: { _count: { entityType: 'desc' } },
    });
    return types.map((t) => t.entityType);
  }
}
