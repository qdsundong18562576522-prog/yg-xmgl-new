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
      where.salesId = userId;
    } else if (role === 'pm') {
      where.OR = [
        { projectManagerId: userId },
        { salesId: userId },
      ];
    }

    return this.prisma.project.findMany({
      where,
      include: {
        sales: { select: { id: true, displayName: true } },
        projectManager: { select: { id: true, displayName: true } },
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
      },
    });
    if (!project) throw new NotFoundException('项目不存在');
    if (role === 'sales' && project.salesId !== userId) {
      throw new ForbiddenException('无权查看此项目');
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
      },
      include: {
        sales: { select: { id: true, displayName: true } },
        projectManager: { select: { id: true, displayName: true } },
      },
    });
  }

  async update(id: number, dto: UpdateProjectDto, userId: number, role: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');

    if (role !== 'admin' && project.salesId !== userId) {
      throw new ForbiddenException('无权编辑此项目');
    }

    if (project.status !== 'draft' && project.status !== 'rejected') {
      throw new BadRequestException('只能编辑草稿或已驳回的项目');
    }

    const data: any = { ...dto };
    if (dto.planStartDate && dto.planEndDate) {
      const startDate = new Date(dto.planStartDate);
      const endDate = new Date(dto.planEndDate);
      data.duration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    return this.prisma.project.update({
      where: { id },
      data,
      include: {
        sales: { select: { id: true, displayName: true } },
        projectManager: { select: { id: true, displayName: true } },
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
}
