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

@Module({
    imports: [
        DatabaseModule,
        TypeOrmModule.forFeature([User, Project, ProjectMember, ProjectCounter, Invitation, Notification]),
    ],
    providers: [SeederService],
})
export class SeederModule {}
