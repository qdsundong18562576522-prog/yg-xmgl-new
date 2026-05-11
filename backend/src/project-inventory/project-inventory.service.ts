import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectInventoryService {
  constructor(private prisma: PrismaService) {}

  async findByProject(projectId?: number) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    return this.prisma.projectInventory.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, code: true } },
        materialLib: { select: { id: true, name: true, brand: true, spec: true, unit: true } },
      },
      orderBy: { materialLib: { name: 'asc' } },
    });
  }
}
