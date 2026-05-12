import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { generateProjectCode } from './utils/code-generator';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, role: string) {
    const where: any = {};

    if (role === 'sales') {
      where.OR = [
        { salesId: userId },
        { members: { some: { userId, role: 'sales' } } },
      ];
    } else if (role === 'pm') {
      where.OR = [
        { projectManagerId: userId },
        { salesId: userId },
        { members: { some: { userId } } },
      ];
    } else if (role === 'engineer') {
      where.members = { some: { userId, role: 'participant' } };
    }
    // admin, leader, purchaser, finance see all

    return this.prisma.project.findMany({
      where,
      include: {
        sales: { select: { id: true, displayName: true } },
        projectManager: { select: { id: true, displayName: true } },
        members: {
          include: { user: { select: { id: true, displayName: true, role: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number, role: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        sales: { select: { id: true, displayName: true } },
        projectManager: { select: { id: true, displayName: true } },
        members: {
          include: { user: { select: { id: true, displayName: true, role: true } } },
        },
      },
    });
    if (!project) throw new NotFoundException('项目不存在');

    // Check view permission
    if (role === 'sales') {
      const isMember = project.members.some((m) => m.userId === userId);
      if (project.salesId !== userId && !isMember) {
        throw new ForbiddenException('无权查看此项目');
      }
    }

    return project;
  }

  async create(dto: CreateProjectDto, userId: number) {
    const code = await generateProjectCode(this.prisma, dto.type, new Date());

    const startDate = new Date(dto.planStartDate);
    const endDate = new Date(dto.planEndDate);
    const duration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const pm = await this.prisma.user.findUnique({ where: { id: dto.projectManagerId } });
    if (!pm) throw new BadRequestException('项目经理不存在');
    if (!['pm', 'engineer'].includes(pm.role)) {
      throw new BadRequestException('所选用户不是项目经理或工程人员');
    }

    // Build member records
    const memberData: { userId: number; role: string }[] = [];
    if (dto.salesMemberIds?.length) {
      for (const sid of dto.salesMemberIds) {
        if (sid !== userId) memberData.push({ userId: sid, role: 'sales' });
      }
    }
    if (dto.participantMemberIds?.length) {
      for (const pid of dto.participantMemberIds) {
        memberData.push({ userId: pid, role: 'participant' });
      }
    }

    return this.prisma.project.create({
      data: {
        code,
        name: dto.name,
        type: dto.type as any,
        salesId: userId,
        description: dto.description,
        contractAmount: dto.contractAmount,
        expectedProfitRate: dto.expectedProfitRate,
        projectManagerId: dto.projectManagerId,
        planStartDate: startDate,
        planEndDate: endDate,
        duration,
        remarks: dto.remarks,
        status: 'draft',
        members: {
          create: memberData,
        },
      },
      include: {
        sales: { select: { id: true, displayName: true } },
        projectManager: { select: { id: true, displayName: true } },
        members: {
          include: { user: { select: { id: true, displayName: true, role: true } } },
        },
      },
    });
  }

  async update(id: number, dto: UpdateProjectDto, userId: number, role: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');

    // Admin can edit any project; others only their own drafts/rejected
    if (role !== 'admin' && project.salesId !== userId) {
      throw new ForbiddenException('无权编辑此项目');
    }
    if (role !== 'admin' && project.status !== 'draft' && project.status !== 'rejected') {
      throw new BadRequestException('只能编辑草稿或已驳回的项目');
    }

    const data: any = {};
    const fields = ['name', 'type', 'description', 'contractAmount', 'expectedProfitRate',
      'projectManagerId', 'remarks'] as const;
    for (const f of fields) {
      if ((dto as any)[f] !== undefined) data[f] = (dto as any)[f];
    }
    if (dto.planStartDate && dto.planEndDate) {
      data.planStartDate = new Date(dto.planStartDate);
      data.planEndDate = new Date(dto.planEndDate);
      data.duration = Math.floor((data.planEndDate.getTime() - data.planStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    // Sync members
    const memberData: { userId: number; role: string }[] = [];
    if (dto.salesMemberIds?.length) {
      for (const sid of dto.salesMemberIds) {
        if (sid !== userId) memberData.push({ userId: sid, role: 'sales' });
      }
    }
    if (dto.participantMemberIds?.length) {
      for (const pid of dto.participantMemberIds) {
        memberData.push({ userId: pid, role: 'participant' });
      }
    }

    // Delete existing members and re-create
    await this.prisma.projectMember.deleteMany({ where: { projectId: id } });

    return this.prisma.project.update({
      where: { id },
      data: {
        ...data,
        members: {
          create: memberData,
        },
      },
      include: {
        sales: { select: { id: true, displayName: true } },
        projectManager: { select: { id: true, displayName: true } },
        members: {
          include: { user: { select: { id: true, displayName: true, role: true } } },
        },
      },
    });
  }

  async submitForApproval(id: number, userId: number, role: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.salesId !== userId && role !== 'admin') {
      throw new ForbiddenException('无权提交此项目');
    }
    if (project.status !== 'draft' && project.status !== 'rejected') {
      throw new BadRequestException('只能提交草稿或已驳回的项目');
    }

    return this.prisma.project.update({
      where: { id },
      data: { status: 'pending' },
    });
  }

  async approve(id: number, userId: number) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.status !== 'pending') throw new BadRequestException('该项目不在审批中');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'leader' && user.role !== 'admin')) {
      throw new ForbiddenException('无权审批项目');
    }

    await this.prisma.approvalHistory.create({
      data: {
        entityType: 'project',
        entityId: id,
        step: 1,
        approverId: userId,
        action: 'approve',
      },
    });

    return this.prisma.project.update({
      where: { id },
      data: { status: 'approved' },
    });
  }

  async reject(id: number, userId: number, comment?: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.status !== 'pending') throw new BadRequestException('该项目不在审批中');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'leader' && user.role !== 'admin')) {
      throw new ForbiddenException('无权审批项目');
    }

    await this.prisma.approvalHistory.create({
      data: {
        entityType: 'project',
        entityId: id,
        step: 1,
        approverId: userId,
        action: 'reject',
        comment,
      },
    });

    return this.prisma.project.update({
      where: { id },
      data: { status: 'rejected' },
    });
  }

  async delete(id: number, userId: number, role: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    if (role !== 'admin') throw new ForbiddenException('仅管理员可删除项目');

    const pr = await this.prisma.purchaseRequest.findFirst({ where: { projectId: id } });
    if (pr) throw new BadRequestException('该项目已有采购申请关联，无法删除');

    await this.prisma.projectMember.deleteMany({ where: { projectId: id } });
    await this.prisma.project.delete({ where: { id } });
    return { id, deleted: true };
  }

  async getLedger(id: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        sales: { select: { id: true, displayName: true } },
        projectManager: { select: { id: true, displayName: true } },
      },
    });
    if (!project) throw new NotFoundException('项目不存在');

    const contractAmount = Number(project.contractAmount);

    // 工程量变更明细
    const variations = await this.prisma.contractVariation.findMany({
      where: { projectId: id, status: 'approved' },
      include: { items: true, createdBy: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const variationAmount = variations.reduce((sum, v) =>
      sum + v.items.reduce((s, i) => s + Number(i.quantity) * Number(i.contractPrice), 0), 0);
    const variationDetails = variations.map(v => ({
      id: v.id, createdBy: v.createdBy?.displayName || '',
      createdAt: v.createdAt,
      items: v.items.map(i => ({
        name: i.name, spec: i.spec, unit: i.unit,
        quantity: Number(i.quantity), contractPrice: Number(i.contractPrice),
        total: Number(i.quantity) * Number(i.contractPrice),
      })),
    }));

    // 采购入库明细
    const stockIns = await this.prisma.stockIn.findMany({
      where: { projectId: id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    const stockInItems = stockIns.flatMap(si => si.items.map(i => ({
      name: i.name, brand: i.brand, spec: i.spec, unit: i.unit,
      quantity: Number(i.quantity), costPrice: Number(i.costPrice),
      total: Number(i.quantity) * Number(i.costPrice),
    })));
    const stockInTotal = stockInItems.reduce((s, i) => s + i.total, 0);

    // 转出到公司库存明细（已审批的转库记录）
    const stockOuts = await this.prisma.stockOut.findMany({
      where: { projectId: id, status: 'approved' },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    const stockOutItems = stockOuts.flatMap(so => so.items.map(i => ({
      name: i.name, brand: i.brand, spec: i.spec, unit: i.unit,
      quantity: Number(i.quantity), costPrice: Number(i.costPrice),
      total: Number(i.quantity) * Number(i.costPrice),
    })));
    const stockOutTotal = stockOutItems.reduce((s, i) => s + i.total, 0);

    // 跨项目成本调整（其他项目转给本项目的 + 本项目转给其他项目的）
    const costAdjIn = await this.prisma.costAdjustment.findMany({
      where: { targetProjectId: id },
      include: { sourceProject: { select: { name: true } } },
    });
    const costAdjInTotal = costAdjIn.reduce((s, c) => s + Number(c.amount), 0);

    const costAdjOut = await this.prisma.costAdjustment.findMany({
      where: { sourceProjectId: id },
      include: { targetProject: { select: { name: true } } },
    });
    const costAdjOutTotal = costAdjOut.reduce((s, c) => s + Number(c.amount), 0);

    // 净采购成本 = 入库 - 转出公司库存 + 其他项目转入 - 转给其他项目
    const netProcurementCost = stockInTotal - stockOutTotal + costAdjInTotal - costAdjOutTotal;

    // 劳务合同
    const laborContracts = await this.prisma.laborContract.findMany({
      where: { projectId: id, status: 'approved' },
      orderBy: { createdAt: 'desc' },
    });
    const laborCostTotal = laborContracts.reduce((sum, lc) => sum + Number(lc.amount), 0);
    const laborContractDetails = laborContracts.map(lc => ({
      code: lc.code, contractorName: lc.contractorName || '',
      amount: Number(lc.amount), status: lc.status,
    }));

    // 劳务签证
    const laborVisas = await this.prisma.laborVisa.findMany({
      where: { laborContract: { projectId: id }, status: 'approved' },
      include: { laborContract: { select: { code: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const laborVisaTotal = laborVisas.reduce((sum, lv) => sum + Number(lv.amountChange), 0);
    const laborVisaDetails = laborVisas.map(lv => ({
      code: lv.code, contractCode: lv.laborContract.code,
      reasonCalc: lv.reasonCalc, amountChange: Number(lv.amountChange),
    }));

    const totalLaborCost = laborCostTotal + laborVisaTotal;

    // 报销（已审批的）
    const reimbursements = await this.prisma.reimbursement.findMany({
      where: { projectId: id, status: 'approved' },
      orderBy: { createdAt: 'desc' },
    });
    const reimbursementTotal = reimbursements.reduce((sum, r) => sum + Number(r.amount), 0);
    const reimbursementDetails = reimbursements.map(r => ({
      id: r.id, reason: r.reason, amount: Number(r.amount), hasInvoice: r.hasInvoice,
    }));

    // 费用申请（已审批的）
    const expenseRequests = await this.prisma.projectExpenseRequest.findMany({
      where: { projectId: id, status: 'approved' },
      orderBy: { createdAt: 'desc' },
    });
    const expenseRequestTotal = expenseRequests.reduce((sum, e) => sum + Number(e.amount), 0);
    const expenseRequestDetails = expenseRequests.map(e => ({
      id: e.id, reason: e.reason, amount: Number(e.amount),
    }));

    const otherCostTotal = reimbursementTotal + expenseRequestTotal;

    // 已付款
    const paymentRequests = await this.prisma.paymentRequest.findMany({
      where: { projectId: id, status: 'approved' },
      include: { confirmations: { take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
    const paymentDetails = paymentRequests.map(pr => ({
      code: pr.code, reason: pr.reason, amount: Number(pr.amount),
      confirmed: pr.confirmations.length > 0,
    }));
    const totalPaidOut = paymentRequests.reduce((sum, pr) => sum + Number(pr.amount), 0);

    // 已回款
    const receivables = await this.prisma.projectReceivable.findMany({
      where: { projectId: id },
      include: { createdBy: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const receivableDetails = receivables.map(r => ({
      amount: Number(r.amount), method: r.method,
      receivedTime: r.receivedTime, createdBy: r.createdBy?.displayName || '',
    }));
    const totalReceivable = receivables.reduce((sum, r) => sum + Number(r.amount), 0);

    // 预期结算额 = 合同金额 + 工程量变更 + 劳务签证变更
    const expectedSettlement = contractAmount + variationAmount + laborVisaTotal;

    // 总成本 = 净采购成本 + 总劳务成本 + 其他成本
    const totalCost = netProcurementCost + totalLaborCost + otherCostTotal;

    // 预期利润
    const expectedProfit = expectedSettlement - totalCost;
    const expectedProfitRate = expectedSettlement > 0
      ? Math.round((expectedProfit / expectedSettlement) * 10000) / 100
      : 0;

    // 回款率
    const receivableRate = expectedSettlement > 0
      ? Math.round((totalReceivable / expectedSettlement) * 10000) / 100
      : 0;

    // 成本占比
    const costBreakdown = {
      procurementPct: totalCost > 0 ? Math.round((netProcurementCost / totalCost) * 100) : 0,
      laborPct: totalCost > 0 ? Math.round((totalLaborCost / totalCost) * 100) : 0,
      otherPct: totalCost > 0 ? Math.round((otherCostTotal / totalCost) * 100) : 0,
    };

    return {
      project: {
        id: project.id, code: project.code, name: project.name,
        type: project.type, status: project.status,
        contractAmount, expectedProfitRate: Number(project.expectedProfitRate || 0),
        salesName: project.sales?.displayName || '',
        pmName: project.projectManager?.displayName || '',
        planStartDate: project.planStartDate,
        planEndDate: project.planEndDate,
        duration: project.duration,
      },
      contractAmount,
      variationAmount,
      variationDetails,
      laborVisaTotal,
      expectedSettlement,
      stockInItems,
      stockInTotal,
      stockOutItems,
      stockOutTotal,
      costAdjustmentsIn: costAdjIn.map(c => ({
        sourceProject: c.sourceProject?.name || '',
        amount: Number(c.amount),
      })),
      costAdjustmentsInTotal: costAdjInTotal,
      costAdjustmentsOut: costAdjOut.map(c => ({
        targetProject: c.targetProject?.name || '',
        amount: Number(c.amount),
      })),
      costAdjustmentsOutTotal: costAdjOutTotal,
      netProcurementCost,
      laborContractDetails,
      laborCostTotal,
      laborVisaDetails,
      totalLaborCost,
      reimbursementDetails,
      reimbursementTotal,
      expenseRequestDetails,
      expenseRequestTotal,
      otherCostTotal,
      paymentDetails,
      totalPaidOut,
      receivableDetails,
      totalReceivable,
      totalCost,
      expectedProfit,
      expectedProfitRate,
      receivableRate,
      costBreakdown,
    };
  }
}
