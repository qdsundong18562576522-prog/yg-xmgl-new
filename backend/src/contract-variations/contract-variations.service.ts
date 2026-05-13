import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateVariationDto } from './dto/create-variation.dto';

@Injectable()
export class ContractVariationsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(projectId?: number) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    return this.prisma.contractVariation.findMany({
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
    const v = await this.prisma.contractVariation.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, displayName: true } },
        items: true,
      },
    });
    if (!v) throw new NotFoundException('工程量变更不存在');
    return v;
  }

  async create(dto: CreateVariationDto, userId: number) {
    return this.prisma.contractVariation.create({
      data: {
        projectId: dto.projectId,
        status: 'draft',
        createdById: userId,
        items: {
          create: dto.items.map((i) => ({
            name: i.name,
            brand: '',
            spec: i.spec || '',
            unit: i.unit || '',
            quantity: i.quantity,
            contractPrice: i.contractPrice,
            total: i.quantity * i.contractPrice,
          })),
        },
      },
      include: {
        items: true,
        project: { select: { id: true, name: true } },
      },
    });
  }

  async submit(id: number, userId: number, role: string) {
    const v = await this.prisma.contractVariation.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('工程量变更不存在');
    if (v.status !== 'draft') throw new BadRequestException('只能提交草稿');
    const result = await this.prisma.contractVariation.update({
      where: { id },
      data: { status: 'pending' },
    });
    const approver = await this.prisma.user.findFirst({ where: { role: 'leader', isActive: true } });
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (approver && currentUser) {
      await this.notifications.notify(approver.id, 'approval_required', '工程量变更审批通知', `${currentUser.displayName} 提交了工程量变更 #${v.id}，待您审批`, 'contract-variation', id);
    }
    return result;
  }

  async approve(id: number, userId: number) {
    const v = await this.prisma.contractVariation.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!v) throw new NotFoundException('工程量变更不存在');
    if (v.status !== 'pending') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role))
      throw new ForbiddenException('无权审批');

    await this.prisma.approvalHistory.create({
      data: {
        entityType: 'contract-variation',
        entityId: id,
        step: 1,
        approverId: userId,
        action: 'approve',
      },
    });

    // Calculate total variation amount and update project ledger
    const totalAmount = v.items.reduce((sum, i) => sum + Number(i.total), 0);
    const ledger = await this.prisma.projectLedger.findUnique({
      where: { projectId: v.projectId },
    });
    if (ledger) {
      await this.prisma.projectLedger.update({
        where: { projectId: v.projectId },
        data: {
          variationAmount: Number(ledger.variationAmount) + totalAmount,
          adjustedAmount: Number(ledger.adjustedAmount) + totalAmount,
          totalCost: Number(ledger.totalCost) + totalAmount,
        },
      });
    }

    const approveResult = await this.prisma.contractVariation.update({
      where: { id },
      data: { status: 'approved' },
    });
    await this.notifications.notify(v.createdById, 'approved', '工程量变更已通过', `您的工程量变更 #${v.id} 已通过审批`, 'contract-variation', id);
    return approveResult;
  }

  async reject(id: number, userId: number, comment?: string) {
    const v = await this.prisma.contractVariation.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('工程量变更不存在');
    if (v.status !== 'pending') throw new BadRequestException('状态错误');

    await this.prisma.approvalHistory.create({
      data: {
        entityType: 'contract-variation',
        entityId: id,
        step: 99,
        approverId: userId,
        action: 'reject',
        comment,
      },
    });

    const rejectResult = await this.prisma.contractVariation.update({
      where: { id },
      data: { status: 'rejected' },
    });
    await this.notifications.notify(v.createdById, 'rejected', '工程量变更已驳回', `您的工程量变更 #${v.id} 已被驳回${comment ? '：' + comment : ''}`, 'contract-variation', id);
    return rejectResult;
  }
}
