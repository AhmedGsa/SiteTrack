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
import { Task } from "src/tasks/entities/task.entity";
import { TaskDependency } from "src/tasks/entities/task-dependency.entity";
import { TaskCounter } from "src/tasks/entities/task-counter.entity";
import { TaskStatus } from "src/tasks/enums/task-status.enum";


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
    @InjectRepository(Task) private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskDependency) private readonly taskDependencyRepository: Repository<TaskDependency>,
    @InjectRepository(TaskCounter) private readonly taskCounterRepository: Repository<TaskCounter>,
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

    if (project) {
      let taskCounter = await this.taskCounterRepository.findOneBy({ projectId: project.id });
      const existingTask = await this.taskRepository.findOneBy({ projectId: project.id });
      if (!existingTask) {
        if (!taskCounter) {
          taskCounter = this.taskCounterRepository.create({ projectId: project.id, lastNumber: 4 });
        } else {
          taskCounter.lastNumber = Math.max(taskCounter.lastNumber, 4);
        }
        await this.taskCounterRepository.save(taskCounter);
        const foundations = this.taskRepository.create({
          projectId: project.id,
          code: `${project.code}-T-0001`,
          name: 'Pour foundations',
          plannedStartDate: '2026-03-01',
          plannedEndDate: '2026-04-01',
          status: TaskStatus.NOT_STARTED,
        });
        const columns = this.taskRepository.create({
          projectId: project.id,
          code: `${project.code}-T-0002`,
          name: 'Raise columns',
          plannedStartDate: '2026-04-02',
          plannedEndDate: '2026-05-01',
          status: TaskStatus.NOT_STARTED,
        });
        const slab = this.taskRepository.create({
          projectId: project.id,
          code: `${project.code}-T-0003`,
          name: 'Pour level 2 slab',
          plannedStartDate: '2026-05-02',
          plannedEndDate: '2026-06-01',
          status: TaskStatus.NOT_STARTED,
        });
        const facade = this.taskRepository.create({
          projectId: project.id,
          code: `${project.code}-T-0004`,
          name: 'Install facade',
          plannedStartDate: '2026-06-02',
          plannedEndDate: '2026-07-15',
          status: TaskStatus.NOT_STARTED,
        });
        await this.taskRepository.save([foundations, columns, slab, facade]);
        await this.taskDependencyRepository.save([
          this.taskDependencyRepository.create({ taskId: columns.id, dependsOnTaskId: foundations.id }),
          this.taskDependencyRepository.create({ taskId: slab.id, dependsOnTaskId: columns.id }),
          this.taskDependencyRepository.create({ taskId: facade.id, dependsOnTaskId: foundations.id }),
          this.taskDependencyRepository.create({ taskId: facade.id, dependsOnTaskId: columns.id }),
        ]);
        console.log('Sample tasks and dependencies created for PRJ-0001');
      }
    }

    console.log('Seeding completed successfully!');
  }
}
