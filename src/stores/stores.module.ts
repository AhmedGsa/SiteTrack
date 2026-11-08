import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoresService } from './stores.service';
import { CompanyStoreController } from './company-store.controller';
import { ProjectStoreController } from './project-store.controller';
import { Store } from './entities/store.entity';
import { Stock } from './entities/stock.entity';
import { Material } from 'src/materials/entities/material.entity';
import { AccessModule } from 'src/access/access.module';

@Module({
  imports: [
    AccessModule,
    TypeOrmModule.forFeature([Store, Stock, Material]),
  ],
  controllers: [CompanyStoreController, ProjectStoreController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
