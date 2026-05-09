import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { spec: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.materialLib.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const material = await this.prisma.materialLib.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('材料不存在');
    return material;
  }

  async create(dto: CreateMaterialDto) {
    try {
      return await this.prisma.materialLib.create({ data: dto });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('该材料已存在（名称+品牌+规格+单位重复）');
      throw e;
    }
  }

  async update(id: number, dto: UpdateMaterialDto) {
    await this.findOne(id);
    try {
      return await this.prisma.materialLib.update({ where: { id }, data: dto });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('更新后与已有材料重复');
      throw e;
    }
  }

  async delete(id: number) {
    await this.findOne(id);
    await this.prisma.materialLib.delete({ where: { id } });
    return { id, deleted: true };
  }
}
