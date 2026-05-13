import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';

@Injectable()
export class MaterialRequisitionsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(projectId?: number) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    return this.prisma.materialRequisition.findMany({
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
    const req = await this.prisma.materialRequisition.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, displayName: true } },
        items: true,
      },
    });
    if (!req) throw new NotFoundException('领用单不存在');
    return req;
  }

  async create(dto: CreateRequisitionDto, userId: number) {
    const items = await Promise.all(dto.items.map(async (item) => {
      const ml = await this.prisma.materialLib.findUnique({ where: { id: item.materialLibId } });
      return {
        materialLibId: item.materialLibId,
        name: ml?.name || '', brand: ml?.brand || '', spec: ml?.spec || '', unit: ml?.unit || '',
        quantity: item.quantity,
        costPrice: item.costPrice,
        contractPrice: item.contractPrice,
        total: item.quantity * item.costPrice,
      };
    }));

    const totalCost = items.reduce((sum, i) => sum + Number(i.total), 0);

    return this.prisma.materialRequisition.create({
      data: {
        projectId: dto.projectId,
        totalCost,
        status: 'draft',
        createdById: userId,
        deliveryMethod: dto.deliveryMethod,
        receiver: dto.receiver,
        phone: dto.phone,
        address: dto.address,
        items: { create: items },
      },
      include: {
        project: { select: { id: true, name: true } },
        items: true,
        createdBy: { select: { id: true, displayName: true } },
      },
    });
  }

  async submit(id: number, userId: number, role: string) {
    const req = await this.prisma.materialRequisition.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('领用单不存在');
    if (req.status !== 'draft') throw new BadRequestException('只能提交草稿');
    const result = await this.prisma.materialRequisition.update({ where: { id }, data: { status: 'pending_purchaser' } });
    const approver = await this.prisma.user.findFirst({ where: { role: 'purchaser', isActive: true } });
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (approver && currentUser) {
      await this.notifications.notify(approver.id, 'approval_required', '材料领用审批通知', `${currentUser.displayName} 提交了材料领用申请 #${req.id}，待您审批`, 'material-requisition', id);
    }
    return result;
  }

  async approvePurchaser(id: number, userId: number) {
    const req = await this.prisma.materialRequisition.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!req) throw new NotFoundException('领用单不存在');
    if (req.status !== 'pending_purchaser') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['purchaser', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'material-requisition', entityId: id, step: 1, approverId: userId, action: 'approve' },
    });
    const purchResult = await this.prisma.materialRequisition.update({ where: { id }, data: { status: 'pending_leader' } });
    await this.notifications.notify(req.createdById, 'approved', '材料领用已通过', `您的材料领用申请 #${req.id} 已通过审批`, 'material-requisition', id);
    return purchResult;
  }

  async approveLeader(id: number, userId: number) {
    const req = await this.prisma.materialRequisition.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!req) throw new NotFoundException('领用单不存在');
    if (req.status !== 'pending_leader') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'material-requisition', entityId: id, step: 2, approverId: userId, action: 'approve' },
    });

    // Execute: decrement company inventory, add to project inventory
    for (const item of req.items) {
      if (!item.materialLibId) continue;

      const ci = await this.prisma.companyInventory.findUnique({
        where: { materialLibId: item.materialLibId },
      });
      if (!ci) throw new BadRequestException(`公司库存中不存在材料`);

      const decrQty = Number(item.quantity);
      if (Number(ci.quantity) < decrQty) throw new BadRequestException(`材料 "${item.name}" 库存不足`);

      await this.prisma.companyInventory.update({
        where: { id: ci.id },
        data: { quantity: Number(ci.quantity) - decrQty },
      });

      // Add to project inventory
      const pi = await this.prisma.projectInventory.findUnique({
        where: { projectId_materialLibId: { projectId: req.projectId, materialLibId: item.materialLibId } },
      });
      if (pi) {
        await this.prisma.projectInventory.update({
          where: { id: pi.id },
          data: { quantity: Number(pi.quantity) + decrQty, costPrice: Number(item.costPrice) },
        });
      } else {
        await this.prisma.projectInventory.create({
          data: { projectId: req.projectId, materialLibId: item.materialLibId, quantity: decrQty, costPrice: Number(item.costPrice) },
        });
      }

      // Cost transfer: check if this material was transferred from another project
      const stockOut = await this.prisma.stockOut.findFirst({
        where: {
          status: 'approved',
          items: { some: { materialLibId: item.materialLibId } },
        },
        include: { items: { where: { materialLibId: item.materialLibId } } },
        orderBy: { createdAt: 'desc' },
      });
      if (stockOut && stockOut.projectId !== req.projectId) {
        const soItem = stockOut.items[0];
        if (soItem) {
          const transferAmount = decrQty * Number(soItem.costPrice);
          await this.prisma.costAdjustment.create({
            data: {
              sourceProjectId: stockOut.projectId,
              targetProjectId: req.projectId,
              stockOutId: stockOut.id,
              requisitionId: id,
              amount: transferAmount,
              status: 'completed',
            },
          });
        }
      }
    }

    const leaderResult = await this.prisma.materialRequisition.update({ where: { id }, data: { status: 'approved' } });
    await this.notifications.notify(req.createdById, 'approved', '材料领用已通过', `您的材料领用申请 #${req.id} 已通过审批`, 'material-requisition', id);
    return leaderResult;
  }

  async reject(id: number, userId: number, comment?: string) {
    const req = await this.prisma.materialRequisition.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('领用单不存在');
    if (!['pending_purchaser', 'pending_leader'].includes(req.status)) throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['purchaser', 'leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权驳回');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'material-requisition', entityId: id, step: 99, approverId: userId, action: 'reject', comment },
    });
    const rejectResult = await this.prisma.materialRequisition.update({ where: { id }, data: { status: 'rejected' } });
    await this.notifications.notify(req.createdById, 'rejected', '材料领用已驳回', `您的材料领用申请 #${req.id} 已被驳回${comment ? '：' + comment : ''}`, 'material-requisition', id);
    return rejectResult;
  }
}
