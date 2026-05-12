import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLaborVisaDto } from './dto/create-labor-visa.dto';

@Injectable()
export class LaborVisasService {
  constructor(private prisma: PrismaService) {}

  async findAll(laborContractId?: number) {
    const where: any = {};
    if (laborContractId) where.laborContractId = laborContractId;
    return this.prisma.laborVisa.findMany({
      where,
      include: { laborContract: { select: { id: true, projectId: true } }, createdBy: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const v = await this.prisma.laborVisa.findUnique({
      where: { id },
      include: { laborContract: { select: { id: true, amount: true, projectId: true } }, createdBy: { select: { id: true, displayName: true } } },
    });
    if (!v) throw new NotFoundException('劳务签证不存在');
    return v;
  }

  async create(dto: CreateLaborVisaDto, userId: number) {
    const lc = await this.prisma.laborContract.findUnique({ where: { id: dto.laborContractId } });
    if (!lc) throw new BadRequestException('劳务合同不存在');
    if (lc.status !== 'approved') throw new BadRequestException('只能基于已审批的劳务合同发起签证');
    return this.prisma.laborVisa.create({
      data: { laborContractId: dto.laborContractId, reasonCalc: dto.reasonCalc, amountChange: dto.amountChange, status: 'draft', createdById: userId },
      include: { laborContract: { select: { id: true } } },
    });
  }

  async submit(id: number, userId: number, role: string) {
    const v = await this.prisma.laborVisa.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('劳务签证不存在');
    if (v.status !== 'draft') throw new BadRequestException('只能提交草稿');
    return this.prisma.laborVisa.update({ where: { id }, data: { status: 'pending' } });
  }

  async approve(id: number, userId: number) {
    const v = await this.prisma.laborVisa.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('劳务签证不存在');
    if (v.status !== 'pending') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({ data: { entityType: 'labor-visa', entityId: id, step: 1, approverId: userId, action: 'approve' } });
    return this.prisma.laborVisa.update({ where: { id }, data: { status: 'approved' } });
  }

  async reject(id: number, userId: number, comment?: string) {
    const v = await this.prisma.laborVisa.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('劳务签证不存在');
    if (v.status !== 'pending') throw new BadRequestException('状态错误');
    await this.prisma.approvalHistory.create({ data: { entityType: 'labor-visa', entityId: id, step: 99, approverId: userId, action: 'reject', comment } });
    return this.prisma.laborVisa.update({ where: { id }, data: { status: 'rejected' } });
  }
}
