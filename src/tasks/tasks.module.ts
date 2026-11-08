import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { TaskCounter } from './entities/task-counter.entity';
import { AccessModule } from 'src/access/access.module';

@Module({
  imports: [
    AccessModule,
    TypeOrmModule.forFeature([Task, TaskDependency, TaskCounter]),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
