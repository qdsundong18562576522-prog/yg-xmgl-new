import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryNoticeDto } from './dto/create-delivery-notice.dto';
import { generateFormCode } from '../common/code-generator';

@Injectable()
export class DeliveryNoticesService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId?: number) {
    const where: any = {};
    if (projectId) {
      where.purchaseConfirm = {
        inquiryOrder: { purchaseRequest: { projectId } },
      };
    }
    return this.prisma.deliveryNotice.findMany({
      where,
      include: {
        purchaseConfirm: {
          include: {
            inquiryOrder: {
              select: { purchaseRequest: { select: { project: { select: { id: true, name: true } } } } },
            },
          },
        },
        items: true,
        createdBy: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const dn = await this.prisma.deliveryNotice.findUnique({
      where: { id },
      include: {
        purchaseConfirm: {
          select: { id: true, code: true,
            inquiryOrder: { select: { id: true, code: true,
              purchaseRequest: { select: { id: true, code: true,
                project: { select: { id: true, name: true, code: true } }
              }
            } }
          }
        }
        },
        items: true,
        createdBy: { select: { id: true, displayName: true } },
      },
    });
    if (!dn) throw new NotFoundException('供货通知单不存在');
    return dn;
  }

  async create(dto: CreateDeliveryNoticeDto, userId: number) {
    const confirm = await this.prisma.purchaseConfirm.findUnique({
      where: { id: dto.confirmId },
      include: { items: true },
    });
    if (!confirm) throw new NotFoundException('采购确认单不存在');
    if (confirm.status !== 'approved') throw new BadRequestException('只能基于已审批的采购确认单');

    // Get project ID from the chain
    const inquiry = await this.prisma.inquiryOrder.findUnique({
      where: { id: confirm.inquiryId },
      include: { purchaseRequest: { select: { projectId: true } } },
    });

    const items = confirm.items.map(item => ({
      confirmItemId: item.id,
      materialLibId: item.materialLibId,
      name: item.name, brand: item.brand, spec: item.spec, unit: item.unit,
      quantity: Number(item.quantity), purchasePrice: Number(item.purchasePrice),
    }));

    const code = await generateFormCode(this.prisma, 'deliveryNotice', new Date());

    return this.prisma.deliveryNotice.create({
      data: {
        code,
        confirmId: dto.confirmId,
        projectId: inquiry?.purchaseRequest.projectId || 0,
        deliveryOption: dto.deliveryOption,
        transportMethod: dto.transportMethod,
        trackingNumber: dto.trackingNumber,
        totalDate: dto.totalDate ? new Date(dto.totalDate) : null,
        receiver: dto.receiver,
        phone: dto.phone,
        address: dto.address,
        status: 'draft',
        createdById: userId,
        items: { create: items },
      },
      include: { items: true },
    });
  }

  async delete(id: number, userId: number, role: string) {
    const dn = await this.prisma.deliveryNotice.findUnique({ where: { id } });
    if (!dn) throw new NotFoundException('供货通知单不存在');
    if (role !== 'admin') throw new ForbiddenException('仅管理员可删除');
    await this.prisma.deliveryNoticeItem.deleteMany({ where: { noticeId: id } });
    await this.prisma.deliveryNotice.delete({ where: { id } });
    return { id, deleted: true };
  }

  async submit(id: number, userId: number, role: string) {
    const dn = await this.prisma.deliveryNotice.findUnique({ where: { id } });
    if (!dn) throw new NotFoundException('供货通知单不存在');
    if (dn.status !== 'draft') throw new BadRequestException('只能提交草稿');
    return this.prisma.deliveryNotice.update({ where: { id }, data: { status: 'pending_purchaser' } });
  }

  async withdraw(id: number, userId: number, role: string) {
    const dn = await this.prisma.deliveryNotice.findUnique({ where: { id } });
    if (!dn) throw new NotFoundException('供货通知单不存在');
    if (!['pending_purchaser', 'pending_leader'].includes(dn.status)) throw new BadRequestException('只能撤回审批中的申请');
    if (dn.createdById !== userId && role !== 'admin') throw new ForbiddenException('无权撤回');
    return this.prisma.deliveryNotice.update({ where: { id }, data: { status: 'draft' } });
  }

  async approvePurchaser(id: number, userId: number) {
    const dn = await this.prisma.deliveryNotice.findUnique({ where: { id } });
    if (!dn) throw new NotFoundException('供货通知单不存在');
    if (dn.status !== 'pending_purchaser') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['purchaser', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'delivery-notice', entityId: id, step: 1, approverId: userId, action: 'approve' },
    });
    return this.prisma.deliveryNotice.update({ where: { id }, data: { status: 'pending_leader' } });
  }

  async approveLeader(id: number, userId: number) {
    const dn = await this.prisma.deliveryNotice.findUnique({ where: { id } });
    if (!dn) throw new NotFoundException('供货通知单不存在');
    if (dn.status !== 'pending_leader') throw new BadRequestException('状态错误');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权审批');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'delivery-notice', entityId: id, step: 2, approverId: userId, action: 'approve' },
    });
    return this.prisma.deliveryNotice.update({ where: { id }, data: { status: 'approved' } });
  }

  async reject(id: number, userId: number, comment?: string) {
    const dn = await this.prisma.deliveryNotice.findUnique({ where: { id } });
    if (!dn) throw new NotFoundException('供货通知单不存在');
    if (!['pending_purchaser', 'pending_leader'].includes(dn.status)) throw new BadRequestException('该单不在审批中');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['purchaser', 'leader', 'admin'].includes(user.role)) throw new ForbiddenException('无权驳回');
    await this.prisma.approvalHistory.create({
      data: { entityType: 'delivery-notice', entityId: id, step: 99, approverId: userId, action: 'reject', comment },
    });
    return this.prisma.deliveryNotice.update({ where: { id }, data: { status: 'rejected' } });
  }
}
