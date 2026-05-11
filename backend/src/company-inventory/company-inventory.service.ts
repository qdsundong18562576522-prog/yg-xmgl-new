import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyInventoryDto } from './dto/create-company-inventory.dto';
import { UpdateCompanyInventoryDto } from './dto/update-company-inventory.dto';

@Injectable()
export class CompanyInventoryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.companyInventory.findMany({
      include: { materialLib: { select: { id: true, name: true, brand: true, spec: true, unit: true } } },
      orderBy: { materialLib: { name: 'asc' } },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.companyInventory.findUnique({
      where: { id },
      include: { materialLib: { select: { id: true, name: true, brand: true, spec: true, unit: true } } },
    });
    if (!item) throw new NotFoundException('库存记录不存在');
    return item;
  }

  async create(dto: CreateCompanyInventoryDto) {
    const existing = await this.prisma.companyInventory.findUnique({
      where: { materialLibId: dto.materialLibId },
    });
    if (existing) throw new ConflictException('该材料已在公司库存中，请使用编辑功能');

    const result = await this.prisma.companyInventory.create({
      data: {
        materialLibId: dto.materialLibId,
        quantity: dto.quantity,
        costPrice: dto.costPrice,
        remark: dto.remark,
      },
      include: { materialLib: { select: { id: true, name: true, brand: true, spec: true, unit: true } } },
    });

    await this.prisma.companyInventoryLog.create({
      data: {
        inventoryId: result.id,
        changeQty: dto.quantity,
        type: 'in',
        costPrice: dto.costPrice,
      },
    });

    return result;
  }

  async update(id: number, dto: UpdateCompanyInventoryDto) {
    await this.findOne(id);
    return this.prisma.companyInventory.update({
      where: { id },
      data: dto,
      include: { materialLib: { select: { id: true, name: true, brand: true, spec: true, unit: true } } },
    });
  }

  async delete(id: number) {
    await this.findOne(id);
    await this.prisma.companyInventory.delete({ where: { id } });
    return { id, deleted: true };
  }

  async findAllLogs(inventoryId: number) {
    return this.prisma.companyInventoryLog.findMany({
      where: { inventoryId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
