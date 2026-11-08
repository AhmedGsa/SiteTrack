import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { SeederService } from './seeder.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectMember } from 'src/projects/entities/project-member.entity';
import { ProjectCounter } from 'src/projects/entities/project-counter.entity';
import { Invitation } from 'src/invitations/entities/invitation.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import { Material } from 'src/materials/entities/material.entity';
import { Task } from 'src/tasks/entities/task.entity';
import { TaskDependency } from 'src/tasks/entities/task-dependency.entity';
import { TaskCounter } from 'src/tasks/entities/task-counter.entity';
import { Store } from 'src/stores/entities/store.entity';
import { Stock } from 'src/stores/entities/stock.entity';
import { Delivery } from 'src/deliveries/entities/delivery.entity';
import { DeliveryLine } from 'src/deliveries/entities/delivery-line.entity';

@Module({
    imports: [
        DatabaseModule,
        TypeOrmModule.forFeature([User, Project, ProjectMember, ProjectCounter, Invitation, Notification, Material, Task, TaskDependency, TaskCounter, Store, Stock, Delivery, DeliveryLine]),
    ],
    providers: [SeederService],
})
export class SeederModule {}
