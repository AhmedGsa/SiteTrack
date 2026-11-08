import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Material } from './entities/material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { FilterMaterialsDto } from './dto/filter-materials.dto';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material) private readonly materialRepository: Repository<Material>,
  ) {}

  async create(createMaterialDto: CreateMaterialDto) {
    const nameExists = await this.materialRepository.findOneBy({ name: createMaterialDto.name });
    if (nameExists) {
      throw new BadRequestException('Material with provided name already exists');
    }
    const material = this.materialRepository.create(createMaterialDto);
    await this.materialRepository.save(material);
    return material;
  }

  async findAll(filterMaterialsDto: FilterMaterialsDto) {
    const page = Number(filterMaterialsDto.page) || 1;
    const pageSize = Number(filterMaterialsDto.pageSize) || 10;
    const sortBy = filterMaterialsDto.sortBy || 'name';
    const sortOrder = filterMaterialsDto.sortOrder || 'ASC';

    const where: any = {};
    if (filterMaterialsDto.category) {
      where.category = filterMaterialsDto.category;
    }
    if (filterMaterialsDto.search) {
      where.name = ILike(`%${filterMaterialsDto.search}%`);
    }

    const [results, count] = await this.materialRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { [sortBy]: sortOrder },
    });
    return { results, count };
  }

  async findCategories() {
    const rows = await this.materialRepository
      .createQueryBuilder('material')
      .select('DISTINCT material.category', 'category')
      .orderBy('material.category', 'ASC')
      .getRawMany();
    return rows.map((row) => row.category);
  }

  async findOne(id: string) {
    const material = await this.materialRepository.findOneBy({ id });
    if (!material) {
      throw new NotFoundException();
    }
    return material;
  }

  async update(id: string, updateMaterialDto: UpdateMaterialDto) {
    const material = await this.findOne(id);
    if (updateMaterialDto.name && updateMaterialDto.name !== material.name) {
      const nameExists = await this.materialRepository.findOneBy({ name: updateMaterialDto.name });
      if (nameExists) {
        throw new BadRequestException('Material with provided name already exists');
      }
    }
    const updated = { ...material, ...updateMaterialDto };
    await this.materialRepository.save(updated);
    return { msg: 'Material updated successfully', material: updated };
  }

  async remove(id: string) {
    const material = await this.findOne(id);
    await this.materialRepository.delete(material.id);
    return { msg: 'Material deleted successfully' };
  }
}
