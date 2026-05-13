import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      pendingApprovalCount,
      activeProjectCount,
      totalProjectCount,
      totalContractAmount,
      monthlyReceivable,
      monthlyExpense,
      lastMonthReceivable,
      lastMonthExpense,
    ] = await Promise.all([
      // Pending approvals across all modules
      this.countPendingApprovals(),
      // Active projects (approved + not past end date)
      this.prisma.project.count({
        where: { status: 'approved', planEndDate: { gte: now } },
      }),
      // Total projects
      this.prisma.project.count(),
      // Total contract amount (approved projects)
      this.prisma.project.aggregate({
        where: { status: 'approved' },
        _sum: { contractAmount: true },
      }),
      // Monthly receivable (current month)
      this.prisma.projectReceivable.aggregate({
        where: { receivedTime: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      // Monthly expense (confirmed payments this month)
      this.prisma.paymentConfirmation.aggregate({
        where: { paymentTime: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      // Last month receivable
      this.prisma.projectReceivable.aggregate({
        where: {
          receivedTime: { gte: startOfLastMonth, lt: endOfLastMonth },
        },
        _sum: { amount: true },
      }),
      // Last month expense
      this.prisma.paymentConfirmation.aggregate({
        where: {
          paymentTime: { gte: startOfLastMonth, lt: endOfLastMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      pendingApprovalCount,
      activeProjectCount,
      totalProjectCount,
      totalContractAmount: Number(totalContractAmount._sum.contractAmount || 0),
      monthlyReceivable: Number(monthlyReceivable._sum.amount || 0),
      monthlyExpense: Number(monthlyExpense._sum.amount || 0),
      lastMonthReceivable: Number(lastMonthReceivable._sum.amount || 0),
      lastMonthExpense: Number(lastMonthExpense._sum.amount || 0),
    };
  }

  async getPendingApprovals(limit = 10) {
    const results: Array<{
      id: number;
      entityType: string;
      title: string;
      code: string;
      projectName: string;
      status: string;
      createdAt: Date;
    }> = [];

    const scans: Promise<void>[] = [
      this.scanTable('project', this.prisma.project, results),
      this.scanTable('purchase-request', this.prisma.purchaseRequest, results),
      this.scanTable('inquiry-order', this.prisma.inquiryOrder, results),
      this.scanTable('purchase-confirm', this.prisma.purchaseConfirm, results),
      this.scanTable('delivery-notice', this.prisma.deliveryNotice, results),
      this.scanTable('stock-out', this.prisma.stockOut, results),
      this.scanTable('material-requisition', this.prisma.materialRequisition, results),
      this.scanTable('expense-request', this.prisma.projectExpenseRequest, results),
      this.scanTable('reimbursement', this.prisma.reimbursement, results),
      this.scanTable('contract-variation', this.prisma.contractVariation, results),
      this.scanTable('labor-contract', this.prisma.laborContract, results),
      this.scanTable('labor-visa', this.prisma.laborVisa, results),
      this.scanTable('payment-request', this.prisma.paymentRequest, results),
    ];

    await Promise.all(scans);

    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return results.slice(0, limit);
  }

  async getProjectProgress() {
    const now = new Date();
    const projects = await this.prisma.project.findMany({
      where: { status: 'approved' },
      include: {
        projectManager: { select: { displayName: true } },
      },
    });

    return projects.map((p) => {
      const totalDays =
        (p.planEndDate.getTime() - p.planStartDate.getTime()) /
        (1000 * 60 * 60 * 24);
      const elapsedDays =
        (now.getTime() - p.planStartDate.getTime()) / (1000 * 60 * 60 * 24);
      const percent = Math.min(
        100,
        Math.max(0, Math.round((elapsedDays / totalDays) * 100)),
      );

      return {
        id: p.id,
        name: p.name,
        type: p.type === 'integration' ? '集成' : '供货',
        pm: p.projectManager.displayName,
        deadline: p.planEndDate.toISOString().slice(0, 10),
        percent,
        status: percent >= 100 ? 'overdue' : percent > 0 ? 'active' : 'pending',
      };
    });
  }

  async getMonthlyTrend(months = 12) {
    const now = new Date();
    const result: Array<{ month: string; receivable: number; expense: number }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d;
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const [receivable, expense] = await Promise.all([
        this.prisma.projectReceivable.aggregate({
          where: { receivedTime: { gte: start, lt: end } },
          _sum: { amount: true },
        }),
        this.prisma.paymentConfirmation.aggregate({
          where: { paymentTime: { gte: start, lt: end } },
          _sum: { amount: true },
        }),
      ]);

      result.push({
        month: label,
        receivable: Number(receivable._sum.amount || 0),
        expense: Number(expense._sum.amount || 0),
      });
    }

    return result;
  }

  private async countPendingApprovals(): Promise<number> {
    const tables = [
      this.prisma.project.count({ where: { status: 'pending' } }),
      this.prisma.purchaseRequest.count({ where: { status: 'pending' } }),
      this.prisma.inquiryOrder.count({ where: { status: { in: ['pending_pm', 'pending_leader'] } } }),
      this.prisma.purchaseConfirm.count({ where: { status: { in: ['pending_pm', 'pending_leader'] } } }),
      this.prisma.deliveryNotice.count({ where: { status: { in: ['pending_purchaser', 'pending_leader'] } } }),
      this.prisma.stockOut.count({ where: { status: { in: ['pending_leader', 'pending_purchaser'] } } }),
      this.prisma.materialRequisition.count({ where: { status: { in: ['pending_purchaser', 'pending_leader'] } } }),
      this.prisma.projectExpenseRequest.count({ where: { status: { in: ['pending_leader', 'pending_finance'] } } }),
      this.prisma.reimbursement.count({ where: { status: { in: ['pending_pm', 'pending_leader', 'pending_finance'] } } }),
      this.prisma.contractVariation.count({ where: { status: 'pending' } }),
      this.prisma.laborContract.count({ where: { status: { in: ['pending_pm', 'pending_leader'] } } }),
      this.prisma.laborVisa.count({ where: { status: 'pending_leader' } }),
      this.prisma.paymentRequest.count({ where: { status: { in: ['pending_leader', 'pending_finance'] } } }),
    ];

    const counts = await Promise.all(tables);
    return counts.reduce((sum, c) => sum + c, 0);
  }

  private async scanTable(
    entityType: string,
    model: any,
    results: Array<{
      id: number;
      entityType: string;
      title: string;
      code: string;
      projectName: string;
      status: string;
      createdAt: Date;
    }>,
  ) {
    const pendingStatuses = this.getPendingStatuses(entityType);
    if (!pendingStatuses.length) return;

    // Entity types with a direct project relation
    const hasDirectProject = [
      'purchase-request', 'delivery-notice', 'stock-out',
      'material-requisition', 'expense-request', 'reimbursement',
      'contract-variation', 'labor-contract', 'payment-request',
    ].includes(entityType);

    let records: any[];
    if (hasDirectProject) {
      records = await model.findMany({
        where: { status: { in: pendingStatuses } },
        include: { project: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    } else {
      records = await model.findMany({
        where: { status: { in: pendingStatuses } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    }

    for (const r of records) {
      let projectName = '';
      if (hasDirectProject) {
        projectName = r.project?.name || '';
      } else if (entityType === 'project') {
        projectName = r.name || '';
      }

      results.push({
        id: r.id,
        entityType,
        title: this.getEntityLabel(entityType),
        code: r.code || `#${r.id}`,
        projectName,
        status: r.status,
        createdAt: r.createdAt,
      });
    }
  }

  private getPendingStatuses(entityType: string): string[] {
    const map: Record<string, string[]> = {
      project: ['pending'],
      'purchase-request': ['pending'],
      'inquiry-order': ['pending_pm', 'pending_leader'],
      'purchase-confirm': ['pending_pm', 'pending_leader'],
      'delivery-notice': ['pending_purchaser', 'pending_leader'],
      'stock-out': ['pending_leader', 'pending_purchaser'],
      'material-requisition': ['pending_purchaser', 'pending_leader'],
      'expense-request': ['pending_leader', 'pending_finance'],
      reimbursement: ['pending_pm', 'pending_leader', 'pending_finance'],
      'contract-variation': ['pending'],
      'labor-contract': ['pending_pm', 'pending_leader'],
      'labor-visa': ['pending_leader'],
      'payment-request': ['pending_leader', 'pending_finance'],
    };
    return map[entityType] || [];
  }

  private getEntityLabel(entityType: string): string {
    const map: Record<string, string> = {
      project: '项目立项',
      'purchase-request': '采购申请',
      'inquiry-order': '采购询价',
      'purchase-confirm': '采购确认',
      'delivery-notice': '供货通知',
      'stock-out': '退库申请',
      'material-requisition': '材料领用',
      'expense-request': '费用申请',
      reimbursement: '报销',
      'contract-variation': '工程量变更',
      'labor-contract': '劳务合同',
      'labor-visa': '劳务签证',
      'payment-request': '付款申请',
    };
    return map[entityType] || entityType;
  }
}
