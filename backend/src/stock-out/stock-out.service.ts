import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockOutDto } from './dto/create-stock-out.dto';

@Injectable()
export class StockOutService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId?: number) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    return this.prisma.stockOut.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, displayName: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const so = await this.prisma.stockOut.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, displayName: true } },
        items: true,
      },
    });
    if (!so) throw new NotFoundException('转库存记录不存在');
    return so;
  }

  async create(dto: CreateStockOutDto, userId: number) {
    // Fetch material names for each item
    const items = await Promise.all(
      dto.items.map(async (item) => {
        const ml = await this.prisma.materialLib.findUnique({ where: { id: item.materialLibId } });
        return {
          materialLibId: item.materialLibId,
          name: ml?.name || '',
          brand: ml?.brand || '',
          spec: ml?.spec || '',
          unit: ml?.unit || '',
          quantity: item.quantity,
          costPrice: item.costPrice,
          costTotal: item.quantity * item.costPrice,
        };
      }),
    );

    return this.prisma.stockOut.create({
      data: {
        projectId: dto.projectId,
        reasonType: dto.reasonType,
        reasonDetail: dto.reasonDetail,
        status: 'pending_leader',
        createdById: userId,
        items: { create: items },
      },
      include: { items: true, project: { select: { id: true, name: true } } },
    });
  }

  async approveLeader(id: number, userId: number) {
    const so = await this.prisma.stockOut.findUnique({ where: { id } });
    if (!so) throw new NotFoundException('转库存记录不存在');
    if (so.status !== 'pending_leader') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    return this.prisma.stockOut.update({ where: { id }, data: { status: 'pending_purchaser' } });
  }

  async approvePurchaser(id: number, userId: number) {
    const so = await this.prisma.stockOut.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!so) throw new NotFoundException('转库存记录不存在');
    if (so.status !== 'pending_purchaser') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['purchaser', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');

    // Execute transfer: decrement project inventory, increment company inventory
    for (const item of so.items) {
      if (!item.materialLibId) continue;

      // Decrement project inventory
      const pi = await this.prisma.projectInventory.findUnique({
        where: { projectId_materialLibId: { projectId: so.projectId, materialLibId: item.materialLibId } },
      });
      if (!pi) throw new BadRequestException(`项目库存中不存在材料 ID ${item.materialLibId}`);
      if (Number(pi.quantity) < Number(item.quantity)) throw new BadRequestException(`材料库存不足`);

      await this.prisma.projectInventory.update({
        where: { id: pi.id },
        data: { quantity: Number(pi.quantity) - Number(item.quantity) },
      });

      // Increment or create company inventory
      const ci = await this.prisma.companyInventory.findUnique({
        where: { materialLibId: item.materialLibId },
      });
      if (ci) {
        await this.prisma.companyInventory.update({
          where: { id: ci.id },
          data: { quantity: Number(ci.quantity) + Number(item.quantity), costPrice: Number(item.costPrice) },
        });
      }
    }

    return this.prisma.stockOut.update({ where: { id }, data: { status: 'approved' } });
  }

  async reject(id: number, userId: number, comment?: string) {
    const so = await this.prisma.stockOut.findUnique({ where: { id } });
    if (!so) throw new NotFoundException('转库存记录不存在');
    if (!['pending_leader', 'pending_purchaser'].includes(so.status)) throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'purchaser', 'admin'].includes(user.role)) throw new ForbiddenException('无权驳回');
    return this.prisma.stockOut.update({ where: { id }, data: { status: 'rejected' } });
  }
}
