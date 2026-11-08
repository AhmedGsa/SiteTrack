import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { ProjectCounter } from './entities/project-counter.entity';
import { AccessModule } from 'src/access/access.module';
import { UsersModule } from 'src/users/users.module';
import { InvitationsModule } from 'src/invitations/invitations.module';
import { TasksModule } from 'src/tasks/tasks.module';
import { StoresModule } from 'src/stores/stores.module';

@Module({
  imports: [
    AccessModule,
    UsersModule,
    InvitationsModule,
    TasksModule,
    StoresModule,
    TypeOrmModule.forFeature([Project, ProjectMember, ProjectCounter]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
