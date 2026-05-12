import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReimbursementDto } from './dto/create-reimbursement.dto';

@Injectable()
export class ReimbursementsService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.reimbursement.update({ where: { id }, data: { status: nextStatus } });
  }

  async approvePm(id: number, userId: number) {
    const r = await this.prisma.reimbursement.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('报销不存在');
    if (r.status !== 'pending_pm') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['pm', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({ data: { entityType: 'reimbursement', entityId: id, step: 1, approverId: userId, action: 'approve' } });
    return this.prisma.reimbursement.update({ where: { id }, data: { status: 'pending_leader' } });
  }

  async approveLeader(id: number, userId: number) {
    const r = await this.prisma.reimbursement.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('报销不存在');
    if (r.status !== 'pending_leader') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({ data: { entityType: 'reimbursement', entityId: id, step: 2, approverId: userId, action: 'approve' } });
    return this.prisma.reimbursement.update({ where: { id }, data: { status: 'pending_finance' } });
  }

  async approveFinance(id: number, userId: number) {
    const r = await this.prisma.reimbursement.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('报销不存在');
    if (r.status !== 'pending_finance') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['finance', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({ data: { entityType: 'reimbursement', entityId: id, step: 3, approverId: userId, action: 'approve' } });
    return this.prisma.reimbursement.update({ where: { id }, data: { status: 'approved' } });
  }

  async reject(id: number, userId: number, comment?: string) {
    const r = await this.prisma.reimbursement.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('报销不存在');
    if (!['pending_pm', 'pending_leader', 'pending_finance'].includes(r.status)) throw new BadRequestException('状态错误');
    await this.prisma.approvalHistory.create({ data: { entityType: 'reimbursement', entityId: id, step: 99, approverId: userId, action: 'reject', comment } });
    return this.prisma.reimbursement.update({ where: { id }, data: { status: 'rejected' } });
  }
}
