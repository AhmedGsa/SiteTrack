import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectMember } from 'src/projects/entities/project-member.entity';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/users/enum/role.enum';
import { UsersService } from 'src/users/users.service';
import { Repository } from 'typeorm';

@Injectable()
export class AccessService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Project) private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember) private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  isSuperAdmin(user: User) {
    return user.role === Role.SUPER_ADMIN;
  }

  isCompanyStoreManager(user: User) {
    return user.role === Role.COMPANY_STORE_MANAGER || user.role === Role.SUPER_ADMIN;
  }

  async getMembership(userId: string, projectId: string) {
    return await this.projectMemberRepository.findOneBy({ userId, projectId });
  }

  async countProjectAdmins(projectId: string) {
    return await this.projectMemberRepository.countBy({ projectId, isAdmin: true });
  }

  async assertCanAccessProject(userId: string, code: string) {
    const project = await this.projectRepository.findOneBy({ code });
    if (!project) {
      throw new NotFoundException();
    }
    const user = await this.usersService.findOne(userId);
    if (this.isSuperAdmin(user)) {
      const membership = await this.getMembership(userId, project.id);
      return { user, project, membership };
    }
    const membership = await this.getMembership(userId, project.id);
    if (!membership) {
      throw new NotFoundException();
    }
    return { user, project, membership };
  }

  async assertCanAccessCompanyStore(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!this.isCompanyStoreManager(user)) {
      throw new NotFoundException();
    }
    return user;
  }

  async assertProjectAdmin(userId: string, code: string) {
    const access = await this.assertCanAccessProject(userId, code);
    if (this.isSuperAdmin(access.user)) {
      return access;
    }
    if (!access.membership?.isAdmin) {
      throw new ForbiddenException();
    }
    return access;
  }
}
