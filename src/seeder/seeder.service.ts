import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/users/entities/user.entity";
import { Repository } from "typeorm";
import { Hash } from "src/auth/utils/hash";
import { Role } from "src/users/enum/role.enum";
import { Project } from "src/projects/entities/project.entity";
import { ProjectMember } from "src/projects/entities/project-member.entity";
import { ProjectCounter } from "src/projects/entities/project-counter.entity";


@Injectable()
export class SeederService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Project) private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember) private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(ProjectCounter) private readonly projectCounterRepository: Repository<ProjectCounter>,
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

    console.log('Seeding completed successfully!');
  }
}
