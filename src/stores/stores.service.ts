import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { Stock } from './entities/stock.entity';
import { Material } from 'src/materials/entities/material.entity';
import { StoreType } from './enums/store-type.enum';
import { StockStatus } from './enums/stock-status.enum';
import { AccessService } from 'src/access/access.service';
import { AddStockDto } from './dto/add-stock.dto';
import { UpdateReorderPointDto } from './dto/update-reorder-point.dto';
import { FilterCompanyStockDto } from './dto/filter-company-stock.dto';
import { FilterProjectStockDto } from './dto/filter-project-stock.dto';

@Injectable()
export class StoresService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly accessService: AccessService,
    @InjectRepository(Store) private readonly storeRepository: Repository<Store>,
    @InjectRepository(Stock) private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Material) private readonly materialRepository: Repository<Material>,
  ) {}

  async getCompanyStock(userId: string, filterDto: FilterCompanyStockDto) {
    await this.accessService.assertCanAccessCompanyStore(userId);
    const store = await this.getOrCreateCompanyStore();
    const page = Number(filterDto.page) || 1;
    const pageSize = Number(filterDto.pageSize) || 10;
    const sortBy = filterDto.sortBy || 'name';
    const sortOrder = filterDto.sortOrder || 'ASC';

    const qb = this.materialRepository.createQueryBuilder('material')
      .leftJoin(Stock, 'stock', 'stock.materialId = material.id AND stock.storeId = :storeId', { storeId: store.id })
      .select('material.id', 'id')
      .addSelect('material.name', 'name')
      .addSelect('material.category', 'category')
      .addSelect('material.unit', 'unit')
      .addSelect('COALESCE(stock.quantity, 0)', 'quantity')
      .addSelect('stock.reorderPoint', 'reorderPoint')
      .addSelect(this.statusSql(), 'status');

    if (filterDto.search) {
      qb.andWhere('material.name ILIKE :search', { search: `%${filterDto.search}%` });
    }
    if (filterDto.category) {
      qb.andWhere('material.category = :category', { category: filterDto.category });
    }
    if (filterDto.status) {
      qb.andWhere(`${this.statusSql()} = :status`, { status: filterDto.status });
    }

    const countRow = await qb.clone().select('COUNT(material.id)', 'count').getRawOne();
    const sortColumn = {
      name: 'material.name',
      quantity: 'quantity',
      status: 'status',
    }[sortBy];

    const rows = await qb
      .orderBy(sortColumn, sortOrder)
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    return {
      results: rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        unit: row.unit,
        quantity: Number(row.quantity),
        quantityInTransit: 0,
        reorderPoint: row.reorderPoint === null || row.reorderPoint === undefined ? null : Number(row.reorderPoint),
        status: row.status,
      })),
      count: Number(countRow?.count || 0),
    };
  }

  async addCompanyStock(userId: string, addStockDto: AddStockDto) {
    await this.accessService.assertCanAccessCompanyStore(userId);
    const material = await this.materialRepository.findOneBy({ id: addStockDto.materialId });
    if (!material) {
      throw new NotFoundException();
    }
    const store = await this.getOrCreateCompanyStore();
    const stock = await this.dataSource.transaction(async (manager) => {
      return await this.addQuantity(manager, store.id, addStockDto.materialId, addStockDto.quantity);
    });
    return this.toCompanyStockItem(material, stock);
  }

  async updateReorderPoint(userId: string, materialId: string, updateReorderPointDto: UpdateReorderPointDto) {
    await this.accessService.assertCanAccessCompanyStore(userId);
    const material = await this.materialRepository.findOneBy({ id: materialId });
    if (!material) {
      throw new NotFoundException();
    }
    const store = await this.getOrCreateCompanyStore();
    const stock = await this.dataSource.transaction(async (manager) => {
      const row = await this.getOrCreateStockForUpdate(manager, store.id, materialId);
      row.reorderPoint = String(updateReorderPointDto.reorderPoint);
      return await manager.save(row);
    });
    return this.toCompanyStockItem(material, stock);
  }

  async getProjectStock(userId: string, projectCode: string, filterDto: FilterProjectStockDto) {
    const { project } = await this.accessService.assertCanAccessProject(userId, projectCode);
    const store = await this.getOrCreateProjectStore(project.id);
    const page = Number(filterDto.page) || 1;
    const pageSize = Number(filterDto.pageSize) || 10;
    const sortBy = filterDto.sortBy || 'name';
    const sortOrder = filterDto.sortOrder || 'ASC';

    const qb = this.stockRepository.createQueryBuilder('stock')
      .innerJoinAndSelect('stock.material', 'material')
      .where('stock.storeId = :storeId', { storeId: store.id });

    if (filterDto.search) {
      qb.andWhere('material.name ILIKE :search', { search: `%${filterDto.search}%` });
    }
    if (filterDto.category) {
      qb.andWhere('material.category = :category', { category: filterDto.category });
    }

    const sortColumn = {
      name: 'material.name',
      quantity: 'stock.quantity',
      lastDelivery: 'stock.lastDeliveryAt',
    }[sortBy];

    const [stocks, count] = await qb
      .orderBy(sortColumn, sortOrder, 'NULLS LAST')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      results: stocks.map((stock) => ({
        id: stock.material.id,
        name: stock.material.name,
        category: stock.material.category,
        unit: stock.material.unit,
        quantity: Number(stock.quantity),
        lastDeliveryAt: stock.lastDeliveryAt,
      })),
      count,
    };
  }

  async createProjectStore(projectId: string, manager?: EntityManager) {
    const storeRepo = manager ? manager.getRepository(Store) : this.storeRepository;
    const existing = await storeRepo.findOneBy({ projectId, type: StoreType.PROJECT });
    if (existing) {
      return existing;
    }
    const store = storeRepo.create({ type: StoreType.PROJECT, projectId });
    return await storeRepo.save(store);
  }

  private async getOrCreateCompanyStore() {
    let store = await this.storeRepository.findOneBy({ type: StoreType.COMPANY });
    if (!store) {
      store = this.storeRepository.create({ type: StoreType.COMPANY, projectId: null });
      store = await this.storeRepository.save(store);
    }
    return store;
  }

  private async getOrCreateProjectStore(projectId: string) {
    return await this.createProjectStore(projectId);
  }

  private async addQuantity(manager: EntityManager, storeId: string, materialId: string, quantity: number) {
    const stock = await this.getOrCreateStockForUpdate(manager, storeId, materialId);
    const next = Number(stock.quantity) + quantity;
    if (next < 0) {
      throw new BadRequestException('Store cannot hold a negative quantity');
    }
    stock.quantity = String(next);
    return await manager.save(stock);
  }

  private async getOrCreateStockForUpdate(manager: EntityManager, storeId: string, materialId: string) {
    let stock = await manager.findOne(Stock, {
      where: { storeId, materialId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!stock) {
      stock = manager.create(Stock, {
        storeId,
        materialId,
        quantity: '0',
      });
      stock = await manager.save(stock);
      stock = await manager.findOne(Stock, {
        where: { id: stock.id },
        lock: { mode: 'pessimistic_write' },
      });
    }
    return stock;
  }

  private statusSql() {
    return `CASE
      WHEN COALESCE(stock.quantity, 0) = 0 THEN 'OUT_OF_STOCK'
      WHEN stock."reorderPoint" IS NOT NULL AND COALESCE(stock.quantity, 0) <= stock."reorderPoint" THEN 'LOW_STOCK'
      ELSE 'AVAILABLE'
    END`;
  }

  private toCompanyStockItem(material: Material, stock: Stock) {
    const quantity = Number(stock.quantity);
    const reorderPoint = stock.reorderPoint === null || stock.reorderPoint === undefined ? null : Number(stock.reorderPoint);
    return {
      id: material.id,
      name: material.name,
      category: material.category,
      unit: material.unit,
      quantity,
      quantityInTransit: 0,
      reorderPoint,
      status: this.statusFrom(quantity, reorderPoint),
    };
  }

  private statusFrom(quantity: number, reorderPoint: number | null) {
    if (quantity === 0) {
      return StockStatus.OUT_OF_STOCK;
    }
    if (reorderPoint !== null && quantity <= reorderPoint) {
      return StockStatus.LOW_STOCK;
    }
    return StockStatus.AVAILABLE;
  }
}
