import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReimbursementDto } from './dto/create-reimbursement.dto';

@Injectable()
export class ReimbursementsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(projectId?: number) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    return this.prisma.reimbursement.findMany({
      where,
      include: { project: { select: { id: true, name: true, code: true } }, createdBy: { select: { id: true, displayName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const r = await this.prisma.reimbursement.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true, code: true } }, createdBy: { select: { id: true, displayName: true, role: true } } },
    });
    if (!r) throw new NotFoundException('报销不存在');
    return r;
  }

  async create(dto: CreateReimbursementDto, userId: number, role: string) {
    // PM role skips PM approval step
    const needsPmApprove = role !== 'pm' && role !== 'admin';
    return this.prisma.reimbursement.create({
      data: {
        projectId: dto.projectId, reason: dto.reason, amount: dto.amount,
        hasInvoice: dto.hasInvoice, invoiceFile: dto.invoiceFile,
        noInvoiceReason: dto.noInvoiceReason,
        status: 'draft', needsPmApprove, createdById: userId,
      },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async submit(id: number, userId: number, role: string) {
    const r = await this.prisma.reimbursement.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('报销不存在');
    if (r.status !== 'draft') throw new BadRequestException('只能提交草稿');
    const nextStatus = r.needsPmApprove ? 'pending_pm' : 'pending_leader';
    const result = await this.prisma.reimbursement.update({ where: { id }, data: { status: nextStatus } });
    const approverRole = r.needsPmApprove ? 'pm' : 'leader';
    const approver = await this.prisma.user.findFirst({ where: { role: approverRole, isActive: true } });
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (approver && currentUser) {
      await this.notifications.notify(approver.id, 'approval_required', '报销审批通知', `${currentUser.displayName} 提交了报销申请 #${r.id}，待您审批`, 'reimbursement', id);
    }
    return result;
  }

  async approvePm(id: number, userId: number) {
    const r = await this.prisma.reimbursement.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('报销不存在');
    if (r.status !== 'pending_pm') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['pm', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({ data: { entityType: 'reimbursement', entityId: id, step: 1, approverId: userId, action: 'approve' } });
    const pmRes = await this.prisma.reimbursement.update({ where: { id }, data: { status: 'pending_leader' } });
    await this.notifications.notify(r.createdById, 'approved', '报销已通过', `您的报销申请 #${r.id} 已通过审批`, 'reimbursement', id);
    return pmRes;
  }

  async approveLeader(id: number, userId: number) {
    const r = await this.prisma.reimbursement.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('报销不存在');
    if (r.status !== 'pending_leader') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({ data: { entityType: 'reimbursement', entityId: id, step: 2, approverId: userId, action: 'approve' } });
    const leaderRes = await this.prisma.reimbursement.update({ where: { id }, data: { status: 'pending_finance' } });
    await this.notifications.notify(r.createdById, 'approved', '报销已通过', `您的报销申请 #${r.id} 已通过审批`, 'reimbursement', id);
    return leaderRes;
  }

  async approveFinance(id: number, userId: number) {
    const r = await this.prisma.reimbursement.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('报销不存在');
    if (r.status !== 'pending_finance') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['finance', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({ data: { entityType: 'reimbursement', entityId: id, step: 3, approverId: userId, action: 'approve' } });
    const financeRes = await this.prisma.reimbursement.update({ where: { id }, data: { status: 'approved' } });
    await this.notifications.notify(r.createdById, 'approved', '报销已通过', `您的报销申请 #${r.id} 已通过审批`, 'reimbursement', id);
    return financeRes;
  }

  async reject(id: number, userId: number, comment?: string) {
    const r = await this.prisma.reimbursement.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('报销不存在');
    if (!['pending_pm', 'pending_leader', 'pending_finance'].includes(r.status)) throw new BadRequestException('状态错误');
    await this.prisma.approvalHistory.create({ data: { entityType: 'reimbursement', entityId: id, step: 99, approverId: userId, action: 'reject', comment } });
    const rejectRes = await this.prisma.reimbursement.update({ where: { id }, data: { status: 'rejected' } });
    await this.notifications.notify(r.createdById, 'rejected', '报销已驳回', `您的报销申请 #${r.id} 已被驳回${comment ? '：' + comment : ''}`, 'reimbursement', id);
    return rejectRes;
  }

  async delete(id: number, userId: number, role: string) {
    const r = await this.prisma.reimbursement.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('报销不存在');
    if (role !== 'admin' && r.createdById !== userId) throw new ForbiddenException('无权删除');
    if (role !== 'admin' && !['draft', 'rejected'].includes(r.status)) throw new BadRequestException('只能删除草稿或已驳回的申请');
    await this.prisma.reimbursement.delete({ where: { id } });
    return { id, deleted: true };
  }
}
