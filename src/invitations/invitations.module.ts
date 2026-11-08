import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { Invitation } from './entities/invitation.entity';
import { AccessModule } from 'src/access/access.module';
import { UsersModule } from 'src/users/users.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    AccessModule,
    UsersModule,
    NotificationsModule,
    TypeOrmModule.forFeature([Invitation]),
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
