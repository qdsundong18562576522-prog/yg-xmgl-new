import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLaborContractDto } from './dto/create-labor-contract.dto';
import { generateFormCode } from '../common/code-generator';

@Injectable()
export class LaborContractsService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId?: number) {
    const where: any = {};
    if (projectId) where.projectId = projectId;
    return this.prisma.laborContract.findMany({
      where,
      include: { project: { select: { id: true, name: true, code: true } }, createdBy: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const lc = await this.prisma.laborContract.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true, code: true } }, createdBy: { select: { id: true, displayName: true } } },
    });
    if (!lc) throw new NotFoundException('劳务合同不存在');
    return lc;
  }

  async create(dto: CreateLaborContractDto, userId: number) {
    const code = await generateFormCode(this.prisma, 'laborContract', new Date());
    return this.prisma.laborContract.create({
      data: {
        code,
        projectId: dto.projectId,
        contractorName: dto.contractorName,
        amount: dto.amount,
        description: dto.description,
        contractFile: dto.contractFile,
        status: 'draft',
        createdById: userId,
      },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async submit(id: number, userId: number, role: string) {
    const lc = await this.prisma.laborContract.findUnique({ where: { id } });
    if (!lc) throw new NotFoundException('劳务合同不存在');
    if (lc.status !== 'draft') throw new BadRequestException('只能提交草稿');
    return this.prisma.laborContract.update({ where: { id }, data: { status: 'pending_pm' } });
  }

  async withdraw(id: number, userId: number, role: string) {
    const lc = await this.prisma.laborContract.findUnique({ where: { id } });
    if (!lc) throw new NotFoundException('劳务合同不存在');
    if (lc.status !== 'pending_pm' && lc.status !== 'pending_leader') throw new BadRequestException('只能撤回审批中的单据');
    if (lc.createdById !== userId && role !== 'admin') throw new ForbiddenException('无权撤回');
    return this.prisma.laborContract.update({ where: { id }, data: { status: 'draft' } });
  }

  async approvePm(id: number, userId: number) {
    const lc = await this.prisma.laborContract.findUnique({ where: { id } });
    if (!lc) throw new NotFoundException('劳务合同不存在');
    if (lc.status !== 'pending_pm') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['pm', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({ data: { entityType: 'labor-contract', entityId: id, step: 1, approverId: userId, action: 'approve' } });
    return this.prisma.laborContract.update({ where: { id }, data: { status: 'pending_leader' } });
  }

  async approveLeader(id: number, userId: number) {
    const lc = await this.prisma.laborContract.findUnique({ where: { id } });
    if (!lc) throw new NotFoundException('劳务合同不存在');
    if (lc.status !== 'pending_leader') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({ data: { entityType: 'labor-contract', entityId: id, step: 2, approverId: userId, action: 'approve' } });
    return this.prisma.laborContract.update({ where: { id }, data: { status: 'approved' } });
  }

  async reject(id: number, userId: number, comment?: string) {
    const lc = await this.prisma.laborContract.findUnique({ where: { id } });
    if (!lc) throw new NotFoundException('劳务合同不存在');
    if (!['pending_pm', 'pending_leader'].includes(lc.status)) throw new BadRequestException('状态错误');
    await this.prisma.approvalHistory.create({ data: { entityType: 'labor-contract', entityId: id, step: 99, approverId: userId, action: 'reject', comment } });
    return this.prisma.laborContract.update({ where: { id }, data: { status: 'rejected' } });
  }
}
