import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Delivery } from './entities/delivery.entity';
import { DeliveryLine } from './entities/delivery-line.entity';
import { DeliveryStatus } from './enums/delivery-status.enum';
import { DeliveryDirection } from './enums/delivery-direction.enum';
import { AccessService } from 'src/access/access.service';
import { StoresService } from 'src/stores/stores.service';
import { Material } from 'src/materials/entities/material.entity';
import { Project } from 'src/projects/entities/project.entity';
import { DeliveryLineDto } from './dto/delivery-line.dto';
import { FilterDeliveriesDto } from './dto/filter-deliveries.dto';

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly accessService: AccessService,
    private readonly storesService: StoresService,
    @InjectRepository(Delivery) private readonly deliveryRepository: Repository<Delivery>,
    @InjectRepository(Material) private readonly materialRepository: Repository<Material>,
    @InjectRepository(Project) private readonly projectRepository: Repository<Project>,
  ) {}

  async createFromCompany(userId: string, projectCode: string, lines: DeliveryLineDto[]) {
    await this.accessService.assertCanAccessCompanyStore(userId);
    const project = await this.findProjectByCode(projectCode);
    return await this.initiate(userId, project, DeliveryDirection.COMPANY_TO_PROJECT, lines);
  }

  async createFromProject(userId: string, projectCode: string, lines: DeliveryLineDto[]) {
    const { project } = await this.accessService.assertCanAccessProject(userId, projectCode);
    return await this.initiate(userId, project, DeliveryDirection.PROJECT_TO_COMPANY, lines);
  }

  async findCompanyDeliveries(userId: string, filterDto: FilterDeliveriesDto) {
    await this.accessService.assertCanAccessCompanyStore(userId);
    return await this.findAll(filterDto);
  }

  async findProjectDeliveries(userId: string, projectCode: string, filterDto: FilterDeliveriesDto) {
    const { project } = await this.accessService.assertCanAccessProject(userId, projectCode);
    return await this.findAll({ ...filterDto, projectId: project.code }, project.id);
  }

  async record(userId: string, deliveryId: string, scope?: { projectCode?: string; company?: boolean }) {
    const delivery = await this.getScopedDelivery(userId, deliveryId, scope);
    await this.assertReceiver(userId, delivery);
    if (delivery.status !== DeliveryStatus.IN_TRANSIT) {
      throw new BadRequestException('Only in-transit deliveries can be recorded');
    }
    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(Delivery, {
        where: { id: delivery.id },
        relations: ['lines'],
        lock: { mode: 'pessimistic_write' },
      });
      if (locked.status !== DeliveryStatus.IN_TRANSIT) {
        throw new BadRequestException('Only in-transit deliveries can be recorded');
      }
      const receiverStore = await this.receiverStore(locked);
      const now = new Date();
      const touchProject = locked.direction === DeliveryDirection.COMPANY_TO_PROJECT;
      for (const line of this.sortedLines(locked.lines)) {
        await this.storesService.adjustQuantity(
          manager,
          receiverStore.id,
          line.materialId,
          Number(line.quantity),
          touchProject ? now : undefined,
        );
      }
      locked.status = DeliveryStatus.DELIVERED;
      locked.receiverUserId = userId;
      locked.receivedAt = now;
      await manager.save(locked);
    });
    return this.findOneResponse(delivery.id);
  }

  async reject(userId: string, deliveryId: string, scope?: { projectCode?: string; company?: boolean }) {
    const delivery = await this.getScopedDelivery(userId, deliveryId, scope);
    await this.assertReceiver(userId, delivery);
    if (delivery.status !== DeliveryStatus.IN_TRANSIT) {
      throw new BadRequestException('Only in-transit deliveries can be rejected');
    }
    await this.returnToSender(delivery.id, userId, DeliveryStatus.REJECTED);
    return this.findOneResponse(delivery.id);
  }

  async cancel(userId: string, deliveryId: string, scope?: { projectCode?: string; company?: boolean }) {
    const delivery = await this.getScopedDelivery(userId, deliveryId, scope);
    if (delivery.senderUserId !== userId) {
      throw new BadRequestException('Only the sender can cancel this delivery');
    }
    if (delivery.status !== DeliveryStatus.IN_TRANSIT) {
      throw new BadRequestException('Only in-transit deliveries can be cancelled');
    }
    await this.returnToSender(delivery.id, null, DeliveryStatus.CANCELLED);
    return this.findOneResponse(delivery.id);
  }

  private async initiate(userId: string, project: Project, direction: DeliveryDirection, lines: DeliveryLineDto[]) {
    const uniqueLines = this.uniqueLines(lines);
    await this.assertMaterialsExist(uniqueLines);
    const sentAt = new Date();
    const deliveryId = await this.dataSource.transaction(async (manager) => {
      const companyStore = await this.storesService.getCompanyStore();
      const projectStore = await this.storesService.getProjectStore(project.id, manager);
      const senderStore = direction === DeliveryDirection.COMPANY_TO_PROJECT ? companyStore : projectStore;
      const touchProject = direction === DeliveryDirection.PROJECT_TO_COMPANY;
      for (const line of uniqueLines) {
        await this.storesService.adjustQuantity(
          manager,
          senderStore.id,
          line.materialId,
          -line.quantity,
          touchProject ? sentAt : undefined,
        );
      }
      const delivery = manager.create(Delivery, {
        direction,
        status: DeliveryStatus.IN_TRANSIT,
        projectId: project.id,
        senderUserId: userId,
        sentAt,
        lines: uniqueLines.map((line) => manager.create(DeliveryLine, {
          materialId: line.materialId,
          quantity: String(line.quantity),
        })),
      });
      const saved = await manager.save(delivery);
      return saved.id;
    });
    return this.findOneResponse(deliveryId);
  }

  private async returnToSender(deliveryId: string, receiverUserId: string | null, status: DeliveryStatus) {
    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(Delivery, {
        where: { id: deliveryId },
        relations: ['lines'],
        lock: { mode: 'pessimistic_write' },
      });
      if (locked.status !== DeliveryStatus.IN_TRANSIT) {
        throw new BadRequestException('Delivery is no longer in transit');
      }
      const senderStore = locked.direction === DeliveryDirection.COMPANY_TO_PROJECT
        ? await this.storesService.getCompanyStore()
        : await this.storesService.getProjectStore(locked.projectId, manager);
      const now = new Date();
      const touchProject = locked.direction === DeliveryDirection.PROJECT_TO_COMPANY;
      for (const line of this.sortedLines(locked.lines)) {
        await this.storesService.adjustQuantity(
          manager,
          senderStore.id,
          line.materialId,
          Number(line.quantity),
          touchProject ? now : undefined,
        );
      }
      locked.status = status;
      locked.receiverUserId = receiverUserId;
      locked.receivedAt = status === DeliveryStatus.CANCELLED ? null : now;
      await manager.save(locked);
    });
  }

  private async findAll(filterDto: FilterDeliveriesDto, projectUuid?: string) {
    const page = Number(filterDto.page) || 1;
    const pageSize = Number(filterDto.pageSize) || 10;
    const qb = this.deliveryRepository.createQueryBuilder('delivery')
      .leftJoinAndSelect('delivery.project', 'project')
      .leftJoinAndSelect('delivery.sender', 'sender')
      .leftJoinAndSelect('delivery.receiver', 'receiver')
      .leftJoinAndSelect('delivery.lines', 'line')
      .leftJoinAndSelect('line.material', 'material')
      .orderBy('delivery.sentAt', 'DESC');

    if (projectUuid) {
      qb.andWhere('delivery.projectId = :projectUuid', { projectUuid });
    } else if (filterDto.projectId) {
      qb.andWhere('project.code = :projectCode', { projectCode: filterDto.projectId });
    }
    if (filterDto.direction) {
      qb.andWhere('delivery.direction = :direction', { direction: filterDto.direction });
    }
    if (filterDto.status) {
      qb.andWhere('delivery.status = :status', { status: filterDto.status });
    }
    if (filterDto.from) {
      qb.andWhere('delivery.sentAt >= :from', { from: filterDto.from });
    }
    if (filterDto.to) {
      qb.andWhere('delivery.sentAt < :to', { to: `${filterDto.to}T23:59:59.999Z` });
    }

    const [deliveries, count] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      results: deliveries.map((delivery) => this.toDeliveryResponse(delivery)),
      count,
    };
  }

  private async findOneResponse(id: string) {
    const delivery = await this.deliveryRepository.findOne({
      where: { id },
      relations: ['project', 'sender', 'receiver', 'lines', 'lines.material'],
    });
    return this.toDeliveryResponse(delivery);
  }

  private async getScopedDelivery(userId: string, deliveryId: string, scope?: { projectCode?: string; company?: boolean }) {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
      relations: ['lines', 'project'],
    });
    if (!delivery) {
      throw new NotFoundException();
    }
    if (scope?.company) {
      await this.accessService.assertCanAccessCompanyStore(userId);
      return delivery;
    }
    if (scope?.projectCode) {
      const { project } = await this.accessService.assertCanAccessProject(userId, scope.projectCode);
      if (delivery.projectId !== project.id) {
        throw new NotFoundException();
      }
      return delivery;
    }
    throw new NotFoundException();
  }

  private async assertReceiver(userId: string, delivery: Delivery) {
    if (delivery.direction === DeliveryDirection.COMPANY_TO_PROJECT) {
      const membership = await this.accessService.getMembership(userId, delivery.projectId);
      const user = await this.accessService.assertCanAccessProject(userId, delivery.project.code);
      if (!membership && !this.accessService.isSuperAdmin(user.user)) {
        throw new NotFoundException();
      }
      return;
    }
    await this.accessService.assertCanAccessCompanyStore(userId);
  }

  private async receiverStore(delivery: Delivery) {
    if (delivery.direction === DeliveryDirection.COMPANY_TO_PROJECT) {
      return await this.storesService.getProjectStore(delivery.projectId);
    }
    return await this.storesService.getCompanyStore();
  }

  private async findProjectByCode(code: string) {
    const project = await this.projectRepository.findOneBy({ code });
    if (!project) {
      throw new NotFoundException();
    }
    return project;
  }

  private uniqueLines(lines: DeliveryLineDto[]) {
    const seen = new Set<string>();
    const unique: DeliveryLineDto[] = [];
    for (const line of [...lines].sort((a, b) => a.materialId.localeCompare(b.materialId))) {
      if (seen.has(line.materialId)) {
        throw new BadRequestException('Delivery cannot contain the same material twice');
      }
      seen.add(line.materialId);
      unique.push(line);
    }
    return unique;
  }

  private sortedLines(lines: DeliveryLine[]) {
    return [...lines].sort((a, b) => a.materialId.localeCompare(b.materialId));
  }

  private async assertMaterialsExist(lines: DeliveryLineDto[]) {
    for (const line of lines) {
      const material = await this.materialRepository.findOneBy({ id: line.materialId });
      if (!material) {
        throw new NotFoundException();
      }
    }
  }

  private toDeliveryResponse(delivery: Delivery) {
    return {
      id: delivery.id,
      direction: delivery.direction,
      status: delivery.status,
      sentAt: delivery.sentAt,
      receivedAt: delivery.receivedAt,
      project: delivery.project ? {
        id: delivery.project.code,
        name: delivery.project.name,
      } : null,
      sentBy: delivery.sender ? {
        id: delivery.sender.id,
        name: delivery.sender.name,
        email: delivery.sender.email,
      } : null,
      receivedBy: delivery.receiver ? {
        id: delivery.receiver.id,
        name: delivery.receiver.name,
        email: delivery.receiver.email,
      } : null,
      materials: (delivery.lines || []).map((line) => ({
        id: line.material?.id || line.materialId,
        name: line.material?.name,
        unit: line.material?.unit,
        quantity: Number(line.quantity),
      })),
    };
  }
}
