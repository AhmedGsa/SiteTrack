import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { ProjectCounter } from './entities/project-counter.entity';
import { AccessModule } from 'src/access/access.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    AccessModule,
    UsersModule,
    TypeOrmModule.forFeature([Project, ProjectMember, ProjectCounter]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
