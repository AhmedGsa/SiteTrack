import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { InvitationStatus } from 'src/invitations/enums/invitation-status.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly notificationRepository: Repository<Notification>,
  ) {}

  async createInvitationNotification(userId: string, invitationId: string) {
    const notification = this.notificationRepository.create({
      userId,
      invitationId,
      type: NotificationType.PROJECT_INVITATION,
    });
    return await this.notificationRepository.save(notification);
  }

  async findAll(userId: string, paginationDto: PaginationDto) {
    const page = Number(paginationDto.page) || 1;
    const pageSize = Number(paginationDto.pageSize) || 10;
    const [results, count] = await this.notificationRepository.findAndCount({
      where: { userId },
      relations: ['invitation', 'invitation.project', 'invitation.inviter'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      results: results.map((notification) => this.toNotificationResponse(notification)),
      count,
    };
  }

  async unreadCount(userId: string) {
    const count = await this.notificationRepository.count({
      where: { userId, readAt: IsNull() },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.notificationRepository.findOneBy({ id, userId });
    if (!notification) {
      throw new NotFoundException();
    }
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }
    return { msg: 'Notification marked as read' };
  }

  async markInvitationNotificationsRead(invitationId: string) {
    await this.notificationRepository.update(
      { invitationId, readAt: IsNull() },
      { readAt: new Date() },
    );
  }

  private toNotificationResponse(notification: Notification) {
    const invitation = notification.invitation;
    return {
      id: notification.id,
      type: notification.type,
      read: !!notification.readAt,
      createdAt: notification.createdAt,
      canRespond: invitation?.status === InvitationStatus.PENDING,
      invitation: invitation ? {
        id: invitation.id,
        status: invitation.status,
        project: invitation.project ? {
          id: invitation.project.code,
          name: invitation.project.name,
        } : null,
        invitedBy: invitation.inviter ? {
          id: invitation.inviter.id,
          name: invitation.inviter.name,
          email: invitation.inviter.email,
        } : null,
      } : null,
    };
  }
}
