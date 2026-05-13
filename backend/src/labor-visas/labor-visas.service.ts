import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLaborVisaDto } from './dto/create-labor-visa.dto';
import { generateFormCode } from '../common/code-generator';

@Injectable()
export class LaborVisasService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(laborContractId?: number) {
    const where: any = {};
    if (laborContractId) where.laborContractId = laborContractId;
    return this.prisma.laborVisa.findMany({
      where,
      include: {
        laborContract: { select: { id: true, code: true, projectId: true } },
        createdBy: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const v = await this.prisma.laborVisa.findUnique({
      where: { id },
      include: {
        laborContract: { select: { id: true, code: true, amount: true, projectId: true } },
        createdBy: { select: { id: true, displayName: true } },
      },
    });
    if (!v) throw new NotFoundException('劳务签证不存在');
    return v;
  }

  async create(dto: CreateLaborVisaDto, userId: number) {
    const lc = await this.prisma.laborContract.findUnique({ where: { id: dto.laborContractId } });
    if (!lc) throw new BadRequestException('劳务合同不存在');
    if (lc.status !== 'approved') throw new BadRequestException('只能基于已审批的劳务合同发起签证');
    const code = await generateFormCode(this.prisma, 'laborVisa', new Date());
    return this.prisma.laborVisa.create({
      data: {
        code,
        laborContractId: dto.laborContractId,
        reasonCalc: dto.reasonCalc,
        amountChange: dto.amountChange,
        description: dto.description,
        status: 'draft',
        createdById: userId,
      },
      include: { laborContract: { select: { id: true, code: true } } },
    });
  }

  async submit(id: number, userId: number, role: string) {
    const v = await this.prisma.laborVisa.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('劳务签证不存在');
    if (v.status !== 'draft') throw new BadRequestException('只能提交草稿');
    const result = await this.prisma.laborVisa.update({ where: { id }, data: { status: 'pending_leader' } });
    const approver = await this.prisma.user.findFirst({ where: { role: 'leader', isActive: true } });
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (approver && currentUser) {
      await this.notifications.notify(approver.id, 'approval_required', '劳务签证审批通知', `${currentUser.displayName} 提交了 ${v.code}，待您审批`, 'labor-visa', id);
    }
    return result;
  }

  async withdraw(id: number, userId: number, role: string) {
    const v = await this.prisma.laborVisa.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('劳务签证不存在');
    if (v.status !== 'pending_leader') throw new BadRequestException('只能撤回审批中的单据');
    if (v.createdById !== userId && role !== 'admin') throw new ForbiddenException('无权撤回');
    const result = await this.prisma.laborVisa.update({ where: { id }, data: { status: 'draft' } });
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    const approver = await this.prisma.user.findFirst({ where: { role: 'leader', isActive: true } });
    const targetUserId = approver?.id || v.createdById;
    if (currentUser) {
      await this.notifications.notify(targetUserId, 'withdrawn', '劳务签证已撤回', `${currentUser.displayName} 撤回了 ${v.code}`, 'labor-visa', id);
    }
    return result;
  }

  async approve(id: number, userId: number) {
    const v = await this.prisma.laborVisa.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('劳务签证不存在');
    if (v.status !== 'pending_leader') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({ data: { entityType: 'labor-visa', entityId: id, step: 1, approverId: userId, action: 'approve' } });
    const approveResult = await this.prisma.laborVisa.update({ where: { id }, data: { status: 'approved' } });
    await this.notifications.notify(v.createdById, 'approved', '劳务签证已通过', `您的 ${v.code} 已通过审批`, 'labor-visa', id);
    return approveResult;
  }

  async reject(id: number, userId: number, comment?: string) {
    const v = await this.prisma.laborVisa.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('劳务签证不存在');
    if (v.status !== 'pending_leader') throw new BadRequestException('状态错误');
    await this.prisma.approvalHistory.create({ data: { entityType: 'labor-visa', entityId: id, step: 99, approverId: userId, action: 'reject', comment } });
    const rejectResult = await this.prisma.laborVisa.update({ where: { id }, data: { status: 'rejected' } });
    await this.notifications.notify(v.createdById, 'rejected', '劳务签证已驳回', `您的 ${v.code} 已被驳回${comment ? '：' + comment : ''}`, 'labor-visa', id);
    return rejectResult;
  }
}
