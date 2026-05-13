import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInquiryOrderDto, UpdateInquiryOrderDto } from './dto/create-inquiry-order.dto';
import { generateFormCode } from '../common/code-generator';

@Injectable()
export class InquiryOrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(projectId?: number) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    return this.prisma.inquiryOrder.findMany({
      where,
      include: {
        purchaseRequest: {
          select: { id: true, code: true, project: { select: { id: true, name: true, code: true } } },
        },
        items: true,
        createdBy: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const io = await this.prisma.inquiryOrder.findUnique({
      where: { id },
      include: {
        purchaseRequest: { select: { id: true, code: true, project: { select: { id: true, name: true, code: true } } } },
        items: true,
        createdBy: { select: { id: true, displayName: true } },
      },
    });
    if (!io) throw new NotFoundException('询价单不存在');
    return io;
  }

  async create(dto: CreateInquiryOrderDto, userId: number) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id: dto.prId },
      include: { items: true },
    });
    if (!pr) throw new NotFoundException('采购申请不存在');
    if (pr.status !== 'approved') throw new BadRequestException('只能基于已审批的采购申请发起询价');

    const allItems: any[] = [];

    for (const group of dto.groups) {
      const prItems = pr.items.filter((item) => group.itemIds.includes(item.id));

      prItems.forEach((item, idx) => {
        const pp = group.purchasePrices?.[idx] ?? 0;
        const qty = group.quantities?.[idx] ?? Number(item.quantity);
        allItems.push({
          materialLibId: item.materialLibId,
          name: item.name, brand: item.brand, spec: item.spec, unit: item.unit,
          quantity: qty,
          contractPrice: Number(item.contractPrice),
          purchasePrice: pp,
          totalPrice: pp * qty,
          isExtra: false,
          groupLabel: group.label,
          supplierName: group.supplierName,
          remark: group.remark,
        });
      });

      if (group.extraItems) {
        for (const ei of group.extraItems) {
          allItems.push({
            materialLibId: null, name: ei.name, brand: '-', spec: '-', unit: '-',
            quantity: 1, contractPrice: 0, purchasePrice: ei.amount,
            totalPrice: ei.amount, isExtra: true,
            groupLabel: group.label,
            supplierName: group.supplierName,
            remark: null,
          });
        }
      }
    }

    const totalAmount = allItems.reduce((sum, i) => sum + Number(i.totalPrice), 0);
    const code = await generateFormCode(this.prisma, 'inquiryOrder', new Date());

    return this.prisma.inquiryOrder.create({
      data: {
        code, prId: dto.prId, totalAmount, status: 'draft', createdById: userId,
        items: { create: allItems },
      },
      include: { purchaseRequest: { select: { id: true } }, items: true },
    });
  }

  async update(id: number, dto: UpdateInquiryOrderDto, userId: number, role: string) {
    const io = await this.prisma.inquiryOrder.findUnique({ where: { id } });
    if (!io) throw new NotFoundException('询价单不存在');
    if (io.status !== 'draft') throw new BadRequestException('只能编辑草稿状态的询价单');

    if (dto.groups) {
      // Delete all existing items and recreate
      await this.prisma.inquiryItem.deleteMany({ where: { inquiryId: id } });

      const allItems: any[] = [];
      // Fetch PR items using the already-stored prId from the existing inquiry
      const pr = await this.prisma.purchaseRequest.findUnique({
        where: { id: io.prId },
        include: { items: true },
      });
      if (!pr) throw new NotFoundException('关联采购申请不存在');

      for (const group of dto.groups) {
        const prItems = pr.items.filter((item) => group.itemIds.includes(item.id));
        prItems.forEach((item, idx) => {
          const pp = group.purchasePrices?.[idx] ?? 0;
          allItems.push({
            inquiryId: id, materialLibId: item.materialLibId,
            name: item.name, brand: item.brand, spec: item.spec, unit: item.unit,
            quantity: Number(item.quantity), contractPrice: Number(item.contractPrice),
            purchasePrice: pp, totalPrice: pp * Number(item.quantity),
            isExtra: false, groupLabel: group.label, supplierName: group.supplierName, remark: group.remark,
          });
        });
        if (group.extraItems) {
          for (const ei of group.extraItems) {
            allItems.push({
              inquiryId: id, materialLibId: null, name: ei.name, brand: '-', spec: '-', unit: '-',
              quantity: 1, contractPrice: 0, purchasePrice: ei.amount,
              totalPrice: ei.amount, isExtra: true,
              groupLabel: group.label, supplierName: group.supplierName, remark: null,
            });
          }
        }
      }

      const totalAmount = allItems.reduce((sum, i) => sum + Number(i.totalPrice), 0);
      await this.prisma.inquiryItem.createMany({ data: allItems });
      return this.prisma.inquiryOrder.update({
        where: { id }, data: { totalAmount },
        include: { items: true, purchaseRequest: { select: { id: true } } },
      });
    }

    return this.findOne(id);
  }

  async delete(id: number, userId: number, role: string) {
    const io = await this.prisma.inquiryOrder.findUnique({ where: { id } });
    if (!io) throw new NotFoundException('询价单不存在');
    if (role !== 'admin') throw new ForbiddenException('仅管理员可删除');
    const pc = await this.prisma.purchaseConfirm.findUnique({ where: { inquiryId: id } });
    if (pc) throw new BadRequestException('该询价单已被采购确认单关联，无法删除');
    await this.prisma.inquiryItem.deleteMany({ where: { inquiryId: id } });
    await this.prisma.inquiryOrder.delete({ where: { id } });
    return { id, deleted: true };
  }

  async submit(id: number, userId: number, role: string) {
    const io = await this.prisma.inquiryOrder.findUnique({ where: { id } });
    if (!io) throw new NotFoundException('询价单不存在');
    if (io.status !== 'draft') throw new BadRequestException('只能提交草稿');
    const result = await this.prisma.inquiryOrder.update({ where: { id }, data: { status: 'pending_pm' } });
    const approver = await this.prisma.user.findFirst({ where: { role: 'pm', isActive: true } });
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (approver && currentUser) {
      await this.notifications.notify(approver.id, 'approval_required', '采购询价审批通知', `${currentUser.displayName} 提交了 ${io.code}，待您审批`, 'inquiry-order', id);
    }
    return result;
  }

  async withdraw(id: number, userId: number, role: string) {
    const io = await this.prisma.inquiryOrder.findUnique({ where: { id } });
    if (!io) throw new NotFoundException('询价单不存在');
    if (!['pending_pm', 'pending_leader'].includes(io.status)) throw new BadRequestException('只能撤回审批中的申请');
    if (io.createdById !== userId && role !== 'admin') throw new ForbiddenException('无权撤回');
    const result = await this.prisma.inquiryOrder.update({ where: { id }, data: { status: 'draft' } });
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    const nextApprover = await this.prisma.user.findFirst({ where: { role: 'pm', isActive: true } });
    const targetUserId = nextApprover?.id || io.createdById;
    if (currentUser) {
      await this.notifications.notify(targetUserId, 'withdrawn', '采购询价已撤回', `${currentUser.displayName} 撤回了 ${io.code}`, 'inquiry-order', id);
    }
    return result;
  }

  async approvePm(id: number, userId: number) {
    const io = await this.prisma.inquiryOrder.findUnique({ where: { id } });
    if (!io) throw new NotFoundException('询价单不存在');
    if (io.status !== 'pending_pm') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['pm', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'inquiry-order', entityId: id, step: 1, approverId: userId, action: 'approve' },
    });
    const result = await this.prisma.inquiryOrder.update({ where: { id }, data: { status: 'pending_leader' } });
    await this.notifications.notify(io.createdById, 'approved', '采购询价已通过', `您的 ${io.code} 已通过审批`, 'inquiry-order', id);
    return result;
  }

  async approveLeader(id: number, userId: number) {
    const io = await this.prisma.inquiryOrder.findUnique({ where: { id } });
    if (!io) throw new NotFoundException('询价单不存在');
    if (io.status !== 'pending_leader') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'inquiry-order', entityId: id, step: 2, approverId: userId, action: 'approve' },
    });
    const result = await this.prisma.inquiryOrder.update({ where: { id }, data: { status: 'approved' } });
    await this.notifications.notify(io.createdById, 'approved', '采购询价已通过', `您的 ${io.code} 已通过审批`, 'inquiry-order', id);
    return result;
  }

  async reject(id: number, userId: number, comment?: string) {
    const io = await this.prisma.inquiryOrder.findUnique({ where: { id } });
    if (!io) throw new NotFoundException('询价单不存在');
    if (!['pending_pm', 'pending_leader'].includes(io.status)) throw new BadRequestException('该单不在审批中');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['pm', 'leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权驳回');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'inquiry-order', entityId: id, step: 99, approverId: userId, action: 'reject', comment },
    });
    const result = await this.prisma.inquiryOrder.update({ where: { id }, data: { status: 'rejected' } });
    await this.notifications.notify(io.createdById, 'rejected', '采购询价已驳回', `您的 ${io.code} 已被驳回${comment ? '：' + comment : ''}`, 'inquiry-order', id);
    return result;
  }
}
