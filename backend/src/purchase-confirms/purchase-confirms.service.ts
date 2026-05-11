import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseConfirmDto } from './dto/create-purchase-confirm.dto';
import { generateFormCode } from '../common/code-generator';

@Injectable()
export class PurchaseConfirmsService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId?: number) {
    const where: any = {};
    if (projectId) {
      where.inquiryOrder = {
        purchaseRequest: { projectId },
      };
    }
    return this.prisma.purchaseConfirm.findMany({
      where,
      include: {
        inquiryOrder: {
          include: {
            purchaseRequest: { select: { project: { select: { id: true, name: true } } } },
          },
        },
        items: true,
        createdBy: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const pc = await this.prisma.purchaseConfirm.findUnique({
      where: { id },
      include: {
        inquiryOrder: {
          select: { id: true, code: true, totalAmount: true,
            purchaseRequest: { select: { id: true, code: true,
              project: { select: { id: true, name: true, code: true } }
            }
          } },
        },
        items: true,
        createdBy: { select: { id: true, displayName: true } },
      },
    });
    if (!pc) throw new NotFoundException('采购确认单不存在');
    return pc;
  }

  async create(dto: CreatePurchaseConfirmDto, userId: number) {
    const inquiry = await this.prisma.inquiryOrder.findUnique({
      where: { id: dto.inquiryId },
      include: { items: true },
    });
    if (!inquiry) throw new NotFoundException('询价单不存在');
    if (inquiry.status !== 'approved') throw new BadRequestException('只能基于已审批的询价单');

    const items = inquiry.items.map(item => ({
      materialLibId: item.materialLibId,
      name: item.name, brand: item.brand, spec: item.spec, unit: item.unit,
      quantity: Number(item.quantity), purchasePrice: Number(item.purchasePrice),
      totalPrice: Number(item.totalPrice),
    }));

    const totalAmount = dto.groups.reduce((sum, g) => sum + g.contractAmount, 0);
    const code = await generateFormCode(this.prisma, 'purchaseConfirm', new Date());

    return this.prisma.purchaseConfirm.create({
      data: {
        code,
        inquiryId: dto.inquiryId,
        totalAmount,
        groupData: JSON.stringify(dto.groups),
        status: 'draft',
        createdById: userId,
        items: { create: items },
      },
      include: { items: true, inquiryOrder: { select: { id: true } } },
    });
  }

  async delete(id: number, userId: number, role: string) {
    const pc = await this.prisma.purchaseConfirm.findUnique({ where: { id } });
    if (!pc) throw new NotFoundException('采购确认单不存在');
    if (role !== 'admin') throw new ForbiddenException('仅管理员可删除');
    // Check if any delivery notice references this confirm
    const dn = await this.prisma.deliveryNotice.findFirst({ where: { confirmId: id } });
    if (dn) throw new BadRequestException('该采购确认单已被供货通知单关联，无法删除');
    await this.prisma.purchaseConfirmItem.deleteMany({ where: { confirmId: id } });
    await this.prisma.purchaseConfirm.delete({ where: { id } });
    return { id, deleted: true };
  }

  async submit(id: number, userId: number, role: string) {
    const pc = await this.prisma.purchaseConfirm.findUnique({ where: { id } });
    if (!pc) throw new NotFoundException('采购确认单不存在');
    if (pc.status !== 'draft') throw new BadRequestException('只能提交草稿');
    return this.prisma.purchaseConfirm.update({ where: { id }, data: { status: 'pending_pm' } });
  }

  async withdraw(id: number, userId: number, role: string) {
    const pc = await this.prisma.purchaseConfirm.findUnique({ where: { id } });
    if (!pc) throw new NotFoundException('采购确认单不存在');
    if (!['pending_pm', 'pending_leader'].includes(pc.status)) throw new BadRequestException('只能撤回审批中的申请');
    if (pc.createdById !== userId && role !== 'admin') throw new ForbiddenException('无权撤回');
    return this.prisma.purchaseConfirm.update({ where: { id }, data: { status: 'draft' } });
  }

  async approvePm(id: number, userId: number) {
    const pc = await this.prisma.purchaseConfirm.findUnique({ where: { id } });
    if (!pc) throw new NotFoundException('采购确认单不存在');
    if (pc.status !== 'pending_pm') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['pm', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'purchase-confirm', entityId: id, step: 1, approverId: userId, action: 'approve' },
    });
    return this.prisma.purchaseConfirm.update({ where: { id }, data: { status: 'pending_leader' } });
  }

  async approveLeader(id: number, userId: number) {
    const pc = await this.prisma.purchaseConfirm.findUnique({ where: { id } });
    if (!pc) throw new NotFoundException('采购确认单不存在');
    if (pc.status !== 'pending_leader') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'purchase-confirm', entityId: id, step: 2, approverId: userId, action: 'approve' },
    });
    return this.prisma.purchaseConfirm.update({ where: { id }, data: { status: 'approved' } });
  }

  async reject(id: number, userId: number, comment?: string) {
    const pc = await this.prisma.purchaseConfirm.findUnique({ where: { id } });
    if (!pc) throw new NotFoundException('采购确认单不存在');
    if (!['pending_pm', 'pending_leader'].includes(pc.status)) throw new BadRequestException('该单不在审批中');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['pm', 'leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权驳回');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'purchase-confirm', entityId: id, step: 99, approverId: userId, action: 'reject', comment },
    });
    return this.prisma.purchaseConfirm.update({ where: { id }, data: { status: 'rejected' } });
  }
}
