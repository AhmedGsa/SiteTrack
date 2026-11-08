import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Invitation } from './entities/invitation.entity';
import { InvitationStatus } from './enums/invitation-status.enum';
import { AccessService } from 'src/access/access.service';
import { UsersService } from 'src/users/users.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ProjectMember } from 'src/projects/entities/project-member.entity';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly accessService: AccessService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Invitation) private readonly invitationRepository: Repository<Invitation>,
  ) {}

  async invite(userId: string, projectCode: string, createInvitationDto: CreateInvitationDto) {
    const { project } = await this.accessService.assertProjectAdmin(userId, projectCode);
    const invitee = await this.usersService.findByEmail(createInvitationDto.email);
    if (!invitee) {
      throw new BadRequestException('User with provided email does not exist');
    }
    if (invitee.id === userId) {
      throw new BadRequestException('You cannot invite yourself');
    }
    const membership = await this.accessService.getMembership(invitee.id, project.id);
    if (membership) {
      throw new BadRequestException('User is already a member of this project');
    }
    const pendingInvite = await this.invitationRepository.findOneBy({
      projectId: project.id,
      inviteeId: invitee.id,
      status: InvitationStatus.PENDING,
    });
    if (pendingInvite) {
      throw new BadRequestException('User already has a pending invitation to this project');
    }

    const invitation = this.invitationRepository.create({
      projectId: project.id,
      inviterId: userId,
      inviteeId: invitee.id,
      status: InvitationStatus.PENDING,
    });
    const saved = await this.invitationRepository.save(invitation);
    await this.notificationsService.createInvitationNotification(invitee.id, saved.id);
    return this.findOneResponse(saved.id);
  }

  async listPending(userId: string, projectCode: string) {
    const { project } = await this.accessService.assertCanAccessProject(userId, projectCode);
    const invitations = await this.invitationRepository.find({
      where: { projectId: project.id, status: InvitationStatus.PENDING },
      relations: ['invitee', 'inviter'],
      order: { createdAt: 'DESC' },
    });
    return invitations.map((invitation) => this.toInvitationResponse(invitation, project.code, project.name));
  }

  async withdraw(userId: string, projectCode: string, invitationId: string) {
    const { project } = await this.accessService.assertProjectAdmin(userId, projectCode);
    const invitation = await this.invitationRepository.findOneBy({ id: invitationId, projectId: project.id });
    if (!invitation) {
      throw new NotFoundException();
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be withdrawn');
    }
    invitation.status = InvitationStatus.WITHDRAWN;
    invitation.answeredAt = new Date();
    await this.invitationRepository.save(invitation);
    await this.notificationsService.markInvitationNotificationsRead(invitation.id);
    return { msg: 'Invitation withdrawn successfully' };
  }

  async accept(userId: string, invitationId: string) {
    const invitation = await this.getOwnPendingInvitation(userId, invitationId);
    await this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(ProjectMember, {
        where: { projectId: invitation.projectId, userId },
      });
      if (!existing) {
        const member = manager.create(ProjectMember, {
          projectId: invitation.projectId,
          userId,
          isAdmin: false,
        });
        await manager.save(member);
      }
      invitation.status = InvitationStatus.ACCEPTED;
      invitation.answeredAt = new Date();
      await manager.save(invitation);
    });
    await this.notificationsService.markInvitationNotificationsRead(invitation.id);
    return { msg: 'Invitation accepted successfully' };
  }

  async reject(userId: string, invitationId: string) {
    const invitation = await this.getOwnPendingInvitation(userId, invitationId);
    invitation.status = InvitationStatus.REJECTED;
    invitation.answeredAt = new Date();
    await this.invitationRepository.save(invitation);
    await this.notificationsService.markInvitationNotificationsRead(invitation.id);
    return { msg: 'Invitation rejected successfully' };
  }

  private async getOwnPendingInvitation(userId: string, invitationId: string) {
    const invitation = await this.invitationRepository.findOneBy({ id: invitationId });
    if (!invitation || invitation.inviteeId !== userId) {
      throw new NotFoundException();
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is no longer pending');
    }
    return invitation;
  }

  private async findOneResponse(id: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { id },
      relations: ['invitee', 'inviter', 'project'],
    });
    return this.toInvitationResponse(invitation, invitation.project.code, invitation.project.name);
  }

  private toInvitationResponse(invitation: Invitation, projectCode: string, projectName: string) {
    return {
      id: invitation.id,
      status: invitation.status,
      createdAt: invitation.createdAt,
      project: {
        id: projectCode,
        name: projectName,
      },
      invitee: invitation.invitee ? {
        id: invitation.invitee.id,
        name: invitation.invitee.name,
        email: invitation.invitee.email,
      } : null,
      invitedBy: invitation.inviter ? {
        id: invitation.inviter.id,
        name: invitation.inviter.name,
        email: invitation.inviter.email,
      } : null,
    };
  }
}
