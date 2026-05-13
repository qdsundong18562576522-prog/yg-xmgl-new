import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { generateFormCode } from '../common/code-generator';

@Injectable()
export class PurchaseRequestsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(projectId?: number) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    return this.prisma.purchaseRequest.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, code: true } },
        items: true,
        createdBy: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, code: true } },
        items: true,
        createdBy: { select: { id: true, displayName: true } },
      },
    });
    if (!pr) throw new NotFoundException('采购申请不存在');
    return pr;
  }

  async create(dto: CreatePurchaseRequestDto, userId: number) {
    // Auto-add new materials to material_lib
    for (const item of dto.items) {
      if (!item.materialLibId) {
        const existing = await this.prisma.materialLib.findFirst({
          where: { name: item.name, brand: item.brand, spec: item.spec, unit: item.unit },
        });
        if (!existing) {
          const created = await this.prisma.materialLib.create({
            data: { name: item.name, brand: item.brand, spec: item.spec, unit: item.unit },
          });
          item.materialLibId = created.id;
        } else {
          item.materialLibId = existing.id;
        }
      }
    }

    const totalAmount = dto.items.reduce((sum, item) => sum + item.quantity * item.contractPrice, 0);
    const code = await generateFormCode(this.prisma, 'purchaseRequest', new Date());

    return this.prisma.purchaseRequest.create({
      data: {
        code,
        projectId: dto.projectId,
        totalAmount,
        deliveryAddress: dto.deliveryAddress,
        receiverId: dto.receiverId,
        phone: dto.phone,
        status: 'draft',
        createdById: userId,
        items: { create: dto.items.map(item => ({
          materialLibId: item.materialLibId,
          name: item.name, brand: item.brand, spec: item.spec, unit: item.unit,
          quantity: item.quantity, contractPrice: item.contractPrice,
          totalPrice: item.quantity * item.contractPrice, remark: item.remark,
        }))},
      },
      include: {
        project: { select: { id: true, name: true } },
        items: true,
        createdBy: { select: { id: true, displayName: true } },
      },
    });
  }

  async update(id: number, dto: UpdatePurchaseRequestDto, userId: number, role: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({ where: { id }, include: { items: true } });
    if (!pr) throw new NotFoundException('采购申请不存在');
    if (pr.status !== 'draft') throw new BadRequestException('只能编辑草稿状态的申请');

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('至少需要一条采购明细');
    }

    const totalAmount = dto.items.reduce((sum, item) => sum + item.quantity * item.contractPrice, 0);

    // Delete old items and recreate
    await this.prisma.purchaseRequestItem.deleteMany({ where: { prId: id } });

    return this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        projectId: dto.projectId,
        totalAmount,
        deliveryAddress: dto.deliveryAddress,
        receiverId: dto.receiverId,
        phone: dto.phone,
        items: {
          create: dto.items.map(item => ({
            materialLibId: item.materialLibId,
            name: item.name, brand: item.brand || '', spec: item.spec || '', unit: item.unit || '',
            quantity: item.quantity, contractPrice: item.contractPrice,
            totalPrice: item.quantity * item.contractPrice,
          })),
        },
      },
      include: {
        project: { select: { id: true, name: true } },
        items: true,
        createdBy: { select: { id: true, displayName: true } },
      },
    });
  }

  async delete(id: number, userId: number, role: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) throw new NotFoundException('采购申请不存在');
    if (role !== 'admin') throw new ForbiddenException('仅管理员可删除');
    // Check if any inquiry order references this PR
    const io = await this.prisma.inquiryOrder.findUnique({ where: { prId: id } });
    if (io) throw new BadRequestException('该采购申请已被询价单关联，无法删除');
    await this.prisma.purchaseRequestItem.deleteMany({ where: { prId: id } });
    await this.prisma.purchaseRequest.delete({ where: { id } });
    return { id, deleted: true };
  }

  async submit(id: number, userId: number, role: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) throw new NotFoundException('采购申请不存在');
    if (pr.status !== 'draft') throw new BadRequestException('只能提交草稿');
    const result = await this.prisma.purchaseRequest.update({ where: { id }, data: { status: 'pending' } });
    const approver = await this.prisma.user.findFirst({ where: { role: 'purchaser', isActive: true } });
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (approver && currentUser) {
      await this.notifications.notify(approver.id, 'approval_required', '采购申请审批通知', `${currentUser.displayName} 提交了 ${pr.code}，待您审批`, 'purchase-request', id);
    }
    return result;
  }

  async withdraw(id: number, userId: number, role: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) throw new NotFoundException('采购申请不存在');
    if (pr.status !== 'pending') throw new BadRequestException('只能撤回审批中的申请');
    if (pr.createdById !== userId && role !== 'admin') throw new ForbiddenException('无权撤回');
    const result = await this.prisma.purchaseRequest.update({ where: { id }, data: { status: 'draft' } });
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    const approver = await this.prisma.user.findFirst({ where: { role: 'purchaser', isActive: true } });
    const targetUserId = approver?.id || pr.createdById;
    if (currentUser) {
      await this.notifications.notify(targetUserId, 'withdrawn', '采购申请已撤回', `${currentUser.displayName} 撤回了 ${pr.code}`, 'purchase-request', id);
    }
    return result;
  }

  async approve(id: number, userId: number) {
    const pr = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) throw new NotFoundException('采购申请不存在');
    if (pr.status !== 'pending') throw new BadRequestException('该申请不在审批中');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'purchase-request', entityId: id, step: 1, approverId: userId, action: 'approve' },
    });
    const result = await this.prisma.purchaseRequest.update({ where: { id }, data: { status: 'approved' } });
    await this.notifications.notify(pr.createdById, 'approved', '采购申请已通过', `您的 ${pr.code} 已通过审批`, 'purchase-request', id);
    return result;
  }

  async reject(id: number, userId: number, comment?: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) throw new NotFoundException('采购申请不存在');
    if (pr.status !== 'pending') throw new BadRequestException('该申请不在审批中');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权驳回');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'purchase-request', entityId: id, step: 1, approverId: userId, action: 'reject', comment },
    });
    const result = await this.prisma.purchaseRequest.update({ where: { id }, data: { status: 'rejected' } });
    await this.notifications.notify(pr.createdById, 'rejected', '采购申请已驳回', `您的 ${pr.code} 已被驳回${comment ? '：' + comment : ''}`, 'purchase-request', id);
    return result;
  }

  async confirm(id: number, userId: number) {
    const pr = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) throw new NotFoundException('采购申请不存在');
    if (pr.status !== 'approved') throw new BadRequestException('只能确认已审批通过的申请');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['purchaser', 'admin'].includes(user.role)) throw new ForbiddenException('仅采购可确认收到');
    return this.prisma.purchaseRequest.update({ where: { id }, data: { status: 'confirmed' } });
  }
}
