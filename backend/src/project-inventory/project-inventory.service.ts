import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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

  async stockOut(dto: { projectId: number; items: { materialLibId: number; quantity: number }[] }) {
    for (const item of dto.items) {
      const pi = await this.prisma.projectInventory.findUnique({
        where: { projectId_materialLibId: { projectId: dto.projectId, materialLibId: item.materialLibId } },
      });
      if (!pi) throw new NotFoundException('材料不存在于项目库存');
      if (Number(pi.quantity) < item.quantity) throw new BadRequestException('库存不足');

      await this.prisma.projectInventory.update({
        where: { id: pi.id },
        data: { quantity: Number(pi.quantity) - item.quantity },
      });
    }
    return { success: true };
  }
}
