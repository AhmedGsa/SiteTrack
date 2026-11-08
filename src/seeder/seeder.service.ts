import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/users/entities/user.entity";
import { Repository } from "typeorm";
import { Hash } from "src/auth/utils/hash";
import { Role } from "src/users/enum/role.enum";
import { Project } from "src/projects/entities/project.entity";
import { ProjectMember } from "src/projects/entities/project-member.entity";
import { ProjectCounter } from "src/projects/entities/project-counter.entity";
import { Invitation } from "src/invitations/entities/invitation.entity";
import { InvitationStatus } from "src/invitations/enums/invitation-status.enum";
import { Notification } from "src/notifications/entities/notification.entity";
import { NotificationType } from "src/notifications/enums/notification-type.enum";
import { Material } from "src/materials/entities/material.entity";


@Injectable()
export class SeederService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Project) private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember) private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(ProjectCounter) private readonly projectCounterRepository: Repository<ProjectCounter>,
    @InjectRepository(Invitation) private readonly invitationRepository: Repository<Invitation>,
    @InjectRepository(Notification) private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(Material) private readonly materialRepository: Repository<Material>,
  ) {}

  async seed() {
    const users = [
      { email: 'superadmin@sitetrack.com', name: 'Super Admin', role: Role.SUPER_ADMIN },
      { email: 'storemanager@sitetrack.com', name: 'Store Manager', role: Role.COMPANY_STORE_MANAGER },
      { email: 'user@sitetrack.com', name: 'Site User', role: Role.USER },
    ];

    const createdUsers: Record<string, User> = {};
    for (const userData of users) {
      let user = await this.userRepository.findOneBy({ email: userData.email });
      if (!user) {
        user = this.userRepository.create({
          ...userData,
          password: await Hash.hash('password123'),
        });
        await this.userRepository.save(user);
        console.log(`${userData.role} created`);
      }
      createdUsers[userData.email] = user;
    }

    let counter = await this.projectCounterRepository.findOneBy({ id: 1 });
    if (!counter) {
      counter = this.projectCounterRepository.create({ id: 1, lastNumber: 0 });
      await this.projectCounterRepository.save(counter);
      console.log('Project counter created');
    }

    const existingProject = await this.projectRepository.findOneBy({ code: 'PRJ-0001' });
    if (!existingProject) {
      counter.lastNumber = Math.max(counter.lastNumber, 1);
      await this.projectCounterRepository.save(counter);
      const project = this.projectRepository.create({
        code: 'PRJ-0001',
        name: 'Riverside Tower',
        plannedStartDate: '2026-03-01',
        plannedEndDate: '2026-12-15',
      });
      await this.projectRepository.save(project);
      const membership = this.projectMemberRepository.create({
        projectId: project.id,
        userId: createdUsers['user@sitetrack.com'].id,
        isAdmin: true,
      });
      await this.projectMemberRepository.save(membership);
      console.log('Project PRJ-0001 created');
    }

    const project = await this.projectRepository.findOneBy({ code: 'PRJ-0001' });
    const inviter = createdUsers['user@sitetrack.com'];
    const invitee = createdUsers['storemanager@sitetrack.com'];
    if (project && inviter && invitee) {
      let invitation = await this.invitationRepository.findOneBy({
        projectId: project.id,
        inviteeId: invitee.id,
        status: InvitationStatus.PENDING,
      });
      if (!invitation) {
        invitation = this.invitationRepository.create({
          projectId: project.id,
          inviterId: inviter.id,
          inviteeId: invitee.id,
          status: InvitationStatus.PENDING,
        });
        await this.invitationRepository.save(invitation);
        const notification = this.notificationRepository.create({
          userId: invitee.id,
          invitationId: invitation.id,
          type: NotificationType.PROJECT_INVITATION,
        });
        await this.notificationRepository.save(notification);
        console.log('Pending invitation created for store manager');
      }
    }

    const materials = [
      { name: 'Cement, OPC 50 kg bag', category: 'Cement', unit: 'bag' },
      { name: 'Sand, washed', category: 'Aggregates', unit: 'm3' },
      { name: 'Rebar, 12 mm', category: 'Steel', unit: 'ton' },
      { name: 'Concrete block, 20 cm', category: 'Masonry', unit: 'pcs' },
    ];
    for (const materialData of materials) {
      const existing = await this.materialRepository.findOneBy({ name: materialData.name });
      if (!existing) {
        const material = this.materialRepository.create(materialData);
        await this.materialRepository.save(material);
        console.log(`Material ${materialData.name} created`);
      }
    }

    console.log('Seeding completed successfully!');
  }
}
