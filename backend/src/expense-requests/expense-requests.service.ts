import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateExpenseRequestDto } from './dto/create-expense-request.dto';

@Injectable()
export class ExpenseRequestsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(projectId?: number) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    return this.prisma.projectExpenseRequest.findMany({
      where,
      include: { project: { select: { id: true, name: true, code: true } }, createdBy: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const r = await this.prisma.projectExpenseRequest.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true, code: true } }, createdBy: { select: { id: true, displayName: true } } },
    });
    if (!r) throw new NotFoundException('费用申请不存在');
    return r;
  }

  async create(dto: CreateExpenseRequestDto, userId: number) {
    return this.prisma.projectExpenseRequest.create({
      data: { projectId: dto.projectId, reason: dto.reason, amount: dto.amount, payMethod: dto.payMethod, otherMethod: dto.otherMethod, status: 'draft', createdById: userId },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async submit(id: number, userId: number, role: string) {
    const r = await this.prisma.projectExpenseRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('费用申请不存在');
    if (r.status !== 'draft') throw new BadRequestException('只能提交草稿');
    const result = await this.prisma.projectExpenseRequest.update({ where: { id }, data: { status: 'pending_leader' } });
    const approver = await this.prisma.user.findFirst({ where: { role: 'leader', isActive: true } });
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (approver && currentUser) {
      await this.notifications.notify(approver.id, 'approval_required', '费用申请审批通知', `${currentUser.displayName} 提交了费用申请 #${r.id}，待您审批`, 'expense-request', id);
    }
    return result;
  }

  async approveLeader(id: number, userId: number) {
    const r = await this.prisma.projectExpenseRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('费用申请不存在');
    if (r.status !== 'pending_leader') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({ data: { entityType: 'expense-request', entityId: id, step: 1, approverId: userId, action: 'approve' } });
    const leaderRes = await this.prisma.projectExpenseRequest.update({ where: { id }, data: { status: 'pending_finance' } });
    await this.notifications.notify(r.createdById, 'approved', '费用申请已通过', `您的费用申请 #${r.id} 已通过审批`, 'expense-request', id);
    return leaderRes;
  }

  async approveFinance(id: number, userId: number) {
    const r = await this.prisma.projectExpenseRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('费用申请不存在');
    if (r.status !== 'pending_finance') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['finance', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({ data: { entityType: 'expense-request', entityId: id, step: 2, approverId: userId, action: 'approve' } });
    const financeRes = await this.prisma.projectExpenseRequest.update({ where: { id }, data: { status: 'approved' } });
    await this.notifications.notify(r.createdById, 'approved', '费用申请已通过', `您的费用申请 #${r.id} 已通过审批`, 'expense-request', id);
    return financeRes;
  }

  async reject(id: number, userId: number, comment?: string) {
    const r = await this.prisma.projectExpenseRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('费用申请不存在');
    if (!['pending_leader', 'pending_finance'].includes(r.status)) throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'finance', 'admin'].includes(user.role)) throw new ForbiddenException('无权驳回');
    await this.prisma.approvalHistory.create({ data: { entityType: 'expense-request', entityId: id, step: 99, approverId: userId, action: 'reject', comment } });
    const rejectRes = await this.prisma.projectExpenseRequest.update({ where: { id }, data: { status: 'rejected' } });
    await this.notifications.notify(r.createdById, 'rejected', '费用申请已驳回', `您的费用申请 #${r.id} 已被驳回${comment ? '：' + comment : ''}`, 'expense-request', id);
    return rejectRes;
  }

  async delete(id: number, userId: number, role: string) {
    const r = await this.prisma.projectExpenseRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('费用申请不存在');
    if (role !== 'admin' && r.createdById !== userId) throw new ForbiddenException('无权删除');
    if (role !== 'admin' && !['draft', 'rejected'].includes(r.status)) throw new BadRequestException('只能删除草稿或已驳回的申请');
    await this.prisma.projectExpenseRequest.delete({ where: { id } });
    return { id, deleted: true };
  }
}
