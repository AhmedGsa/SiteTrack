import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { ProjectCounter } from './entities/project-counter.entity';
import { AccessService } from 'src/access/access.service';
import { UsersService } from 'src/users/users.service';
import { Role } from 'src/users/enum/role.enum';
import { InvitationsService } from 'src/invitations/invitations.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly accessService: AccessService,
    private readonly usersService: UsersService,
    private readonly invitationsService: InvitationsService,
    @InjectRepository(Project) private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember) private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  async create(userId: string, createProjectDto: CreateProjectDto) {
    this.assertValidDates(createProjectDto.plannedStartDate, createProjectDto.plannedEndDate);

    const project = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO project_counters (id, "lastNumber") VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [1, 0],
      );
      const counter = await manager.findOne(ProjectCounter, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      if (!counter) {
        throw new BadRequestException('Project counter is not initialized');
      }
      counter.lastNumber += 1;
      await manager.save(counter);

      const created = manager.create(Project, {
        code: this.formatProjectCode(counter.lastNumber),
        name: createProjectDto.name,
        plannedStartDate: createProjectDto.plannedStartDate,
        plannedEndDate: createProjectDto.plannedEndDate,
      });
      const savedProject = await manager.save(created);

      const membership = manager.create(ProjectMember, {
        projectId: savedProject.id,
        userId,
        isAdmin: true,
      });
      await manager.save(membership);

      return savedProject;
    });

    return this.toProjectResponse(project, true, 1);
  }

  async findAll(userId: string, filterProjectsDto: FilterProjectsDto) {
    const user = await this.usersService.findOne(userId);
    const page = Number(filterProjectsDto.page) || 1;
    const pageSize = Number(filterProjectsDto.pageSize) || 10;
    const sortBy = filterProjectsDto.sortBy || 'name';
    const sortOrder = filterProjectsDto.sortOrder || 'ASC';

    const qb = this.projectRepository.createQueryBuilder('project')
      .leftJoin('project.members', 'myMembership', 'myMembership.userId = :userId', { userId })
      .leftJoin('project.members', 'allMembers');

    if (user.role !== Role.SUPER_ADMIN) {
      qb.andWhere('myMembership.id IS NOT NULL');
    }

    if (filterProjectsDto.search) {
      qb.andWhere('(project.name ILIKE :search OR project.code ILIKE :search)', {
        search: `%${filterProjectsDto.search}%`,
      });
    }

    if (filterProjectsDto.lateOnly) {
      qb.andWhere('1 = 0');
    }

    const countRow = await qb.clone()
      .select('COUNT(DISTINCT project.id)', 'count')
      .getRawOne();
    const count = Number(countRow?.count || 0);

    const sortColumn = {
      name: 'project.name',
      startDate: 'project.plannedStartDate',
      percentageDone: 'project.code',
      lateTasks: 'project.code',
    }[sortBy];

    const rows = await qb
      .select('project.id', 'internalId')
      .addSelect('project.code', 'id')
      .addSelect('project.name', 'name')
      .addSelect('project.plannedStartDate', 'plannedStartDate')
      .addSelect('project.plannedEndDate', 'plannedEndDate')
      .addSelect('COUNT(DISTINCT allMembers.id)', 'memberCount')
      .addSelect('COALESCE(BOOL_OR(myMembership.isAdmin), false)', 'isProjectAdmin')
      .groupBy('project.id')
      .orderBy(sortColumn, sortOrder)
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    return {
      results: rows.map((row) => this.toProjectResponse(
        {
          code: row.id,
          name: row.name,
          plannedStartDate: row.plannedStartDate,
          plannedEndDate: row.plannedEndDate,
        },
        this.toBool(row.isProjectAdmin),
        Number(row.memberCount),
      )),
      count,
    };
  }

  async findOne(userId: string, code: string) {
    const { project, membership, user } = await this.accessService.assertCanAccessProject(userId, code);
    const memberCount = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project.members', 'members')
      .where('project.id = :id', { id: project.id })
      .select('COUNT(members.id)', 'memberCount')
      .getRawOne();

    return this.toProjectResponse(
      project,
      this.accessService.isSuperAdmin(user) ? !!membership?.isAdmin : membership.isAdmin,
      Number(memberCount?.memberCount || 0),
    );
  }

  async update(userId: string, code: string, updateProjectDto: UpdateProjectDto) {
    const { project, membership, user } = await this.accessService.assertProjectAdmin(userId, code);
    const plannedStartDate = updateProjectDto.plannedStartDate ?? project.plannedStartDate;
    const plannedEndDate = updateProjectDto.plannedEndDate ?? project.plannedEndDate;
    this.assertValidDates(plannedStartDate, plannedEndDate);

    const updated = {
      ...project,
      ...updateProjectDto,
      plannedStartDate,
      plannedEndDate,
    };
    await this.projectRepository.save(updated);

    const memberCount = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project.members', 'members')
      .where('project.id = :id', { id: project.id })
      .select('COUNT(members.id)', 'memberCount')
      .getRawOne();

    return {
      msg: 'Project updated successfully',
      project: this.toProjectResponse(
        updated,
        this.accessService.isSuperAdmin(user) ? !!membership?.isAdmin : membership.isAdmin,
        Number(memberCount?.memberCount || 0),
      ),
    };
  }

  async remove(userId: string, code: string) {
    const { project } = await this.accessService.assertProjectAdmin(userId, code);
    await this.projectRepository.delete(project.id);
    return { msg: 'Project deleted successfully' };
  }

  async findMembers(userId: string, code: string) {
    const { project } = await this.accessService.assertCanAccessProject(userId, code);
    const members = await this.projectMemberRepository.find({
      where: { projectId: project.id },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
    const invitations = await this.invitationsService.listPending(userId, code);
    return {
      members: members.map((member) => this.toMemberResponse(member)),
      invitations,
    };
  }

  async updateMember(userId: string, code: string, memberUserId: string, updateMemberDto: UpdateMemberDto) {
    const { project } = await this.accessService.assertProjectAdmin(userId, code);
    const member = await this.projectMemberRepository.findOne({
      where: { projectId: project.id, userId: memberUserId },
      relations: ['user'],
    });
    if (!member) {
      throw new NotFoundException();
    }
    if (member.isAdmin && updateMemberDto.isAdmin === false) {
      await this.assertNotLastAdmin(project.id);
    }
    member.isAdmin = updateMemberDto.isAdmin;
    await this.projectMemberRepository.save(member);
    return { msg: 'Member updated successfully', member: this.toMemberResponse(member) };
  }

  async removeMember(userId: string, code: string, memberUserId: string) {
    const { project } = await this.accessService.assertProjectAdmin(userId, code);
    const member = await this.projectMemberRepository.findOneBy({ projectId: project.id, userId: memberUserId });
    if (!member) {
      throw new NotFoundException();
    }
    if (member.isAdmin) {
      await this.assertNotLastAdmin(project.id);
    }
    await this.projectMemberRepository.delete(member.id);
    return { msg: 'Member removed successfully' };
  }

  private async assertNotLastAdmin(projectId: string) {
    const adminCount = await this.accessService.countProjectAdmins(projectId);
    if (adminCount <= 1) {
      throw new BadRequestException('A project must always have at least one project admin');
    }
  }

  private toMemberResponse(member: ProjectMember) {
    return {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      isAdmin: member.isAdmin,
      joinedAt: member.createdAt,
    };
  }

  private formatProjectCode(number: number) {
    return `PRJ-${String(number).padStart(4, '0')}`;
  }

  private assertValidDates(plannedStartDate: string, plannedEndDate: string) {
    if (new Date(plannedEndDate) < new Date(plannedStartDate)) {
      throw new BadRequestException('Planned end date cannot be before planned start date');
    }
  }

  private toBool(value: any) {
    return value === true || value === 't' || value === 'true';
  }

  private toProjectResponse(project: Pick<Project, 'code' | 'name' | 'plannedStartDate' | 'plannedEndDate'>, isProjectAdmin: boolean, memberCount: number) {
    return {
      id: project.code,
      name: project.name,
      plannedStartDate: project.plannedStartDate,
      plannedEndDate: project.plannedEndDate,
      isProjectAdmin,
      memberCount,
      taskCounts: {
        notStarted: 0,
        inProgress: 0,
        done: 0,
      },
      percentageDone: 0,
      lateTasks: 0,
      blockedTasks: 0,
    };
  }
}
