import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('approval-history')
@UseGuards(JwtAuthGuard)
export class ApprovalHistoryController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query('entityType') entityType: string, @Query('entityId') entityId: string) {
    if (!entityType || !entityId) return [];
    return this.prisma.approvalHistory.findMany({
      where: { entityType, entityId: parseInt(entityId) },
      include: { approver: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
