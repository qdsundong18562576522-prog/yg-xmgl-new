import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseRequestDto } from './dto/create-expense-request.dto';

@Injectable()
export class ExpenseRequestsService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.projectExpenseRequest.update({ where: { id }, data: { status: 'pending_leader' } });
  }

  async approveLeader(id: number, userId: number) {
    const r = await this.prisma.projectExpenseRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('费用申请不存在');
    if (r.status !== 'pending_leader') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({ data: { entityType: 'expense-request', entityId: id, step: 1, approverId: userId, action: 'approve' } });
    return this.prisma.projectExpenseRequest.update({ where: { id }, data: { status: 'pending_finance' } });
  }

  async approveFinance(id: number, userId: number) {
    const r = await this.prisma.projectExpenseRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('费用申请不存在');
    if (r.status !== 'pending_finance') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['finance', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({ data: { entityType: 'expense-request', entityId: id, step: 2, approverId: userId, action: 'approve' } });
    return this.prisma.projectExpenseRequest.update({ where: { id }, data: { status: 'approved' } });
  }

  async reject(id: number, userId: number, comment?: string) {
    const r = await this.prisma.projectExpenseRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('费用申请不存在');
    if (!['pending_leader', 'pending_finance'].includes(r.status)) throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'finance', 'admin'].includes(user.role)) throw new ForbiddenException('无权驳回');
    await this.prisma.approvalHistory.create({ data: { entityType: 'expense-request', entityId: id, step: 99, approverId: userId, action: 'reject', comment } });
    return this.prisma.projectExpenseRequest.update({ where: { id }, data: { status: 'rejected' } });
  }
}
