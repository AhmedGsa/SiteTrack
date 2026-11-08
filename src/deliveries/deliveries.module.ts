import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveriesService } from './deliveries.service';
import { CompanyDeliveriesController } from './company-deliveries.controller';
import { ProjectDeliveriesController } from './project-deliveries.controller';
import { Delivery } from './entities/delivery.entity';
import { DeliveryLine } from './entities/delivery-line.entity';
import { Material } from 'src/materials/entities/material.entity';
import { Project } from 'src/projects/entities/project.entity';
import { AccessModule } from 'src/access/access.module';
import { StoresModule } from 'src/stores/stores.module';

@Module({
  imports: [
    AccessModule,
    StoresModule,
    TypeOrmModule.forFeature([Delivery, DeliveryLine, Material, Project]),
  ],
  controllers: [CompanyDeliveriesController, ProjectDeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
