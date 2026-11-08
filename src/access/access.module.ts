import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessService } from './access.service';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectMember } from 'src/projects/entities/project-member.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([Project, ProjectMember]),
  ],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
