import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto';
import { generateFormCode } from '../common/code-generator';

@Injectable()
export class PaymentRequestsService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId?: number) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    return this.prisma.paymentRequest.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, displayName: true } },
        confirmations: { take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const pr = await this.prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, displayName: true } },
        confirmations: { take: 1 },
      },
    });
    if (!pr) throw new NotFoundException('付款申请不存在');
    return pr;
  }

  async create(dto: CreatePaymentRequestDto, userId: number) {
    // Validate remaining amount
    if (dto.contractType === 'purchase_confirm' || dto.contractType === 'labor_contract') {
      const remaining = await this.getRemainingAmount(dto.contractType, dto.contractId);
      if (dto.amount > remaining) {
        throw new BadRequestException(`该合同剩余可申请金额为 ¥${remaining.toLocaleString()}，申请金额不能超过剩余金额`);
      }
    }

    const code = await generateFormCode(this.prisma, 'paymentRequest', new Date());
    return this.prisma.paymentRequest.create({
      data: {
        code,
        projectId: dto.projectId,
        contractType: dto.contractType,
        contractId: dto.contractId,
        contractData: dto.contractData ? JSON.stringify(dto.contractData) : null,
        paymentTerms: dto.paymentTerms,
        reason: dto.reason,
        amount: dto.amount,
        status: 'draft',
        createdById: userId,
      },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async submit(id: number, userId: number, role: string) {
    const pr = await this.prisma.paymentRequest.findUnique({ where: { id } });
    if (!pr) throw new NotFoundException('付款申请不存在');
    if (pr.status !== 'draft') throw new BadRequestException('只能提交草稿');
    return this.prisma.paymentRequest.update({ where: { id }, data: { status: 'pending_leader' } });
  }

  async withdraw(id: number, userId: number, role: string) {
    const pr = await this.prisma.paymentRequest.findUnique({ where: { id } });
    if (!pr) throw new NotFoundException('付款申请不存在');
    if (pr.status !== 'pending_leader' && pr.status !== 'pending_finance') throw new BadRequestException('只能撤回审批中的单据');
    if (pr.createdById !== userId && role !== 'admin') throw new ForbiddenException('无权撤回');
    return this.prisma.paymentRequest.update({ where: { id }, data: { status: 'draft' } });
  }

  async approveLeader(id: number, userId: number) {
    const pr = await this.prisma.paymentRequest.findUnique({ where: { id } });
    if (!pr) throw new NotFoundException('付款申请不存在');
    if (pr.status !== 'pending_leader') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'payment-request', entityId: id, step: 1, approverId: userId, action: 'approve' },
    });
    return this.prisma.paymentRequest.update({ where: { id }, data: { status: 'pending_finance' } });
  }

  async approveFinance(id: number, userId: number) {
    const pr = await this.prisma.paymentRequest.findUnique({ where: { id } });
    if (!pr) throw new NotFoundException('付款申请不存在');
    if (pr.status !== 'pending_finance') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['finance', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'payment-request', entityId: id, step: 2, approverId: userId, action: 'approve' },
    });
    return this.prisma.paymentRequest.update({ where: { id }, data: { status: 'approved' } });
  }

  async reject(id: number, userId: number, comment?: string) {
    const pr = await this.prisma.paymentRequest.findUnique({ where: { id } });
    if (!pr) throw new NotFoundException('付款申请不存在');
    if (!['pending_leader', 'pending_finance'].includes(pr.status)) throw new BadRequestException('状态错误');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'payment-request', entityId: id, step: 99, approverId: userId, action: 'reject', comment },
    });
    return this.prisma.paymentRequest.update({ where: { id }, data: { status: 'rejected' } });
  }

  async getRemainingAmount(contractType: string, contractId: number): Promise<number> {
    const remainingData = await this.getRemaining(contractType, contractId);
    return remainingData.remaining;
  }

  async getRemaining(contractType: string, contractId: number) {
    const all = await this.prisma.paymentRequest.findMany({
      where: { contractType, contractId, status: { not: 'rejected' } },
      select: { amount: true, contractData: true },
    });

    let totalAmount = 0;
    let contractItems: { label: string; total: number; paid: number; remaining: number }[] = [];

    if (contractType === 'purchase_confirm') {
      const confirm = await this.prisma.purchaseConfirm.findUnique({ where: { id: contractId } });
      totalAmount = Number(confirm?.totalAmount || 0);

      // Get group data from confirm
      let groups: { supplierName?: string; contractAmount?: number }[] = [];
      try { groups = JSON.parse(confirm?.groupData || '[]'); } catch (_) { groups = []; }

      // Calculate paid per contract from existing payment requests' contractData
      const paidPerLabel: Record<string, number> = {};
      let uncategorizedAmount = 0;
      for (const pr of all) {
        if (!pr.contractData) {
          uncategorizedAmount += Number(pr.amount);
          continue;
        }
        try {
          const items = JSON.parse(pr.contractData as string);
          for (const item of items) {
            const label = item.contractLabel || '';
            paidPerLabel[label] = (paidPerLabel[label] || 0) + Number(item.amount || 0);
          }
        } catch (_) { /* skip */ }
      }

      const totalGroupsAmount = groups.reduce((sum, g) => sum + Number(g.contractAmount || 0), 0);

      contractItems = groups.map((g, i) => {
        const label = `合同${i + 1} - ${g.supplierName} (¥${Number(g.contractAmount || 0).toLocaleString()})`;
        const amount = Number(g.contractAmount || 0);
        // Distribute uncategorized amount proportionally
        const share = totalGroupsAmount > 0 ? amount / totalGroupsAmount : 1 / groups.length;
        const extra = Math.round(uncategorizedAmount * share);
        const paid = (paidPerLabel[label] || 0) + extra;
        return { label, total: amount, paid, remaining: Math.max(0, amount - paid) };
      });
    } else if (contractType === 'labor_contract') {
      const lc = await this.prisma.laborContract.findUnique({ where: { id: contractId } });
      totalAmount = Number(lc?.amount || 0);
    }

    const totalPaid = all.reduce((sum, r) => sum + Number(r.amount), 0);
    return { totalAmount, totalPaid, remaining: Math.max(0, totalAmount - totalPaid), contractItems };
  }

  async confirmPay(id: number, userId: number, dto: { amount?: number; paymentTime?: string }) {
    const pr = await this.prisma.paymentRequest.findUnique({
      where: { id },
      include: { confirmations: true },
    });
    if (!pr) throw new NotFoundException('付款申请不存在');
    if (pr.status !== 'approved') throw new BadRequestException('只能确认已通过的付款申请');
    if (pr.confirmations.length > 0) throw new BadRequestException('该申请已确认付款');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['finance', 'admin'].includes(user.role)) throw new ForbiddenException('仅财务可确认付款');

    return this.prisma.paymentConfirmation.create({
      data: {
        paymentRequestId: id,
        amount: dto.amount || pr.amount,
        paymentTime: dto.paymentTime ? new Date(dto.paymentTime) : new Date(),
      },
    });
  }
}
