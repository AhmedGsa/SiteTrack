import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { AccessService } from 'src/access/access.service';
import { Task } from './entities/task.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { TaskCounter } from './entities/task-counter.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { TaskStatus } from './enums/task-status.enum';
import { TaskGraph, todayUtcDate } from './task-graph';

@Injectable()
export class TasksService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly accessService: AccessService,
    @InjectRepository(Task) private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskDependency) private readonly taskDependencyRepository: Repository<TaskDependency>,
  ) {}

  async create(userId: string, projectCode: string, createTaskDto: CreateTaskDto) {
    const { project } = await this.accessService.assertCanAccessProject(userId, projectCode);
    this.assertValidDates(createTaskDto.plannedStartDate, createTaskDto.plannedEndDate);

    const task = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO task_counters ("projectId", "lastNumber") VALUES ($1, $2) ON CONFLICT ("projectId") DO NOTHING`,
        [project.id, 0],
      );
      const counter = await manager.findOne(TaskCounter, {
        where: { projectId: project.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!counter) {
        throw new BadRequestException('Task counter is not initialized');
      }
      counter.lastNumber += 1;
      await manager.save(counter);

      const created = manager.create(Task, {
        projectId: project.id,
        code: `${project.code}-T-${String(counter.lastNumber).padStart(4, '0')}`,
        name: createTaskDto.name,
        plannedStartDate: createTaskDto.plannedStartDate,
        plannedEndDate: createTaskDto.plannedEndDate,
        status: TaskStatus.NOT_STARTED,
      });
      const saved = await manager.save(created);

      if (createTaskDto.dependsOn?.length) {
        const graph = await this.loadGraph(project.id, manager);
        for (const dependsOnCode of createTaskDto.dependsOn) {
          const dependsOn = await manager.findOne(Task, {
            where: { projectId: project.id, code: dependsOnCode },
          });
          if (!dependsOn) {
            throw new NotFoundException();
          }
          if (graph.wouldCreateCycle(saved.id, dependsOn.id)) {
            throw new BadRequestException('Dependency would create a cycle');
          }
          const dependency = manager.create(TaskDependency, {
            taskId: saved.id,
            dependsOnTaskId: dependsOn.id,
          });
          await manager.save(dependency);
          graph.getDirectDependsOn(saved.id).push(dependsOn.id);
          graph.getDirectDependents(dependsOn.id).push(saved.id);
        }
      }

      return saved;
    });

    return this.findOne(userId, projectCode, task.code);
  }

  async findAll(userId: string, projectCode: string, filterTasksDto: FilterTasksDto) {
    const { project } = await this.accessService.assertCanAccessProject(userId, projectCode);
    const graph = await this.loadGraph(project.id);
    const today = todayUtcDate();
    const page = Number(filterTasksDto.page) || 1;
    const pageSize = Number(filterTasksDto.pageSize) || 10;
    const sortBy = filterTasksDto.sortBy || 'id';
    const sortOrder = filterTasksDto.sortOrder || 'ASC';

    let items = (await this.taskRepository.find({ where: { projectId: project.id } }))
      .map((task) => this.toListItem(task, graph, today));

    if (filterTasksDto.search) {
      const search = filterTasksDto.search.toLowerCase();
      items = items.filter((task) => task.id.toLowerCase().includes(search) || task.name.toLowerCase().includes(search));
    }
    if (filterTasksDto.status) {
      items = items.filter((task) => task.status === filterTasksDto.status);
    }
    if (filterTasksDto.late) {
      items = items.filter((task) => task.late);
    }
    if (filterTasksDto.blocked) {
      items = items.filter((task) => task.blocked);
    }
    if (filterTasksDto.from) {
      items = items.filter((task) => task.plannedEndDate >= filterTasksDto.from);
    }
    if (filterTasksDto.to) {
      items = items.filter((task) => task.plannedStartDate <= filterTasksDto.to);
    }

    items.sort((a, b) => {
      const direction = sortOrder === 'DESC' ? -1 : 1;
      if (sortBy === 'dependentCount') {
        return (a.dependentCount - b.dependentCount) * direction;
      }
      const left = {
        id: a.id,
        name: a.name,
        startDate: a.plannedStartDate,
        endDate: a.plannedEndDate,
      }[sortBy];
      const right = {
        id: b.id,
        name: b.name,
        startDate: b.plannedStartDate,
        endDate: b.plannedEndDate,
      }[sortBy];
      return left.localeCompare(right) * direction;
    });

    const count = items.length;
    const results = items.slice((page - 1) * pageSize, page * pageSize);
    return { results, count };
  }

  async findOne(userId: string, projectCode: string, taskCode: string) {
    const { project } = await this.accessService.assertCanAccessProject(userId, projectCode);
    const graph = await this.loadGraph(project.id);
    const task = await this.taskRepository.findOneBy({ projectId: project.id, code: taskCode });
    if (!task) {
      throw new NotFoundException();
    }
    const today = todayUtcDate();
    const waitsOn = [...graph.waitsOnDistances(task.id).entries()].map(([id, distance]) => {
      const other = graph.getTask(id);
      return { id: other.code, name: other.name, status: other.status, distance };
    }).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
    const waitedOnBy = [...graph.waitedOnByDistances(task.id).entries()].map(([id, distance]) => {
      const other = graph.getTask(id);
      return { id: other.code, name: other.name, status: other.status, distance };
    }).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));

    return {
      ...this.toListItem(task, graph, today),
      allowedActions: graph.allowedActions(task),
      waitsOn,
      waitedOnBy,
    };
  }

  async update(userId: string, projectCode: string, taskCode: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.getProjectTask(userId, projectCode, taskCode);
    const plannedStartDate = updateTaskDto.plannedStartDate ?? task.plannedStartDate;
    const plannedEndDate = updateTaskDto.plannedEndDate ?? task.plannedEndDate;
    this.assertValidDates(plannedStartDate, plannedEndDate);
    const updated = { ...task, ...updateTaskDto, plannedStartDate, plannedEndDate };
    await this.taskRepository.save(updated);
    return this.findOne(userId, projectCode, task.code);
  }

  async remove(userId: string, projectCode: string, taskCode: string) {
    const task = await this.getProjectTask(userId, projectCode, taskCode);
    await this.taskRepository.delete(task.id);
    return { msg: 'Task deleted successfully' };
  }

  async start(userId: string, projectCode: string, taskCode: string) {
    const { project } = await this.accessService.assertCanAccessProject(userId, projectCode);
    const graph = await this.loadGraph(project.id);
    const task = await this.requireTask(project.id, taskCode, graph);
    if (!graph.canStart(task)) {
      throw new BadRequestException('Task cannot be started');
    }
    task.status = TaskStatus.IN_PROGRESS;
    await this.taskRepository.save(task);
    return this.findOne(userId, projectCode, task.code);
  }

  async markDone(userId: string, projectCode: string, taskCode: string) {
    const { project } = await this.accessService.assertCanAccessProject(userId, projectCode);
    const graph = await this.loadGraph(project.id);
    const task = await this.requireTask(project.id, taskCode, graph);
    if (!graph.canMarkDone(task)) {
      throw new BadRequestException('Task cannot be marked as done');
    }
    task.status = TaskStatus.DONE;
    await this.taskRepository.save(task);
    return this.findOne(userId, projectCode, task.code);
  }

  async reopen(userId: string, projectCode: string, taskCode: string) {
    const { project } = await this.accessService.assertCanAccessProject(userId, projectCode);
    const graph = await this.loadGraph(project.id);
    const task = await this.requireTask(project.id, taskCode, graph);
    if (!graph.canReopen(task)) {
      throw new BadRequestException('Task cannot be reopened');
    }
    task.status = TaskStatus.IN_PROGRESS;
    await this.taskRepository.save(task);
    return this.findOne(userId, projectCode, task.code);
  }

  async addDependency(userId: string, projectCode: string, taskCode: string, dependsOnTaskCode: string) {
    const { project } = await this.accessService.assertCanAccessProject(userId, projectCode);
    const graph = await this.loadGraph(project.id);
    const task = await this.requireTask(project.id, taskCode, graph);
    const dependsOn = await this.requireTask(project.id, dependsOnTaskCode, graph);
    if (graph.getDirectDependsOn(task.id).includes(dependsOn.id)) {
      throw new BadRequestException('Dependency already exists');
    }
    if (graph.wouldCreateCycle(task.id, dependsOn.id)) {
      throw new BadRequestException('Dependency would create a cycle');
    }
    const dependency = this.taskDependencyRepository.create({
      taskId: task.id,
      dependsOnTaskId: dependsOn.id,
    });
    await this.taskDependencyRepository.save(dependency);
    return this.findOne(userId, projectCode, task.code);
  }

  async removeDependency(userId: string, projectCode: string, taskCode: string, dependsOnTaskCode: string) {
    const { project } = await this.accessService.assertCanAccessProject(userId, projectCode);
    const graph = await this.loadGraph(project.id);
    const task = await this.requireTask(project.id, taskCode, graph);
    const dependsOn = await this.requireTask(project.id, dependsOnTaskCode, graph);
    const dependency = await this.taskDependencyRepository.findOneBy({
      taskId: task.id,
      dependsOnTaskId: dependsOn.id,
    });
    if (!dependency) {
      throw new NotFoundException();
    }
    await this.taskDependencyRepository.delete(dependency.id);
    return { msg: 'Dependency removed successfully' };
  }

  async getProjectTaskStats(projectIds: string[]) {
    const stats = new Map(projectIds.map((id) => [id, {
      notStarted: 0,
      inProgress: 0,
      done: 0,
      percentageDone: 0,
      lateTasks: 0,
      blockedTasks: 0,
    }]));
    if (!projectIds.length) {
      return stats;
    }
    const tasks = await this.taskRepository.find({ where: { projectId: In(projectIds) } });
    const dependencies = tasks.length
      ? await this.taskDependencyRepository.find({
          where: { taskId: In(tasks.map((task) => task.id)) },
        })
      : [];
    const tasksByProject = new Map<string, Task[]>();
    for (const task of tasks) {
      const list = tasksByProject.get(task.projectId) || [];
      list.push(task);
      tasksByProject.set(task.projectId, list);
    }
    const today = todayUtcDate();
    for (const projectId of projectIds) {
      const projectTasks = tasksByProject.get(projectId) || [];
      const projectTaskIds = new Set(projectTasks.map((task) => task.id));
      const projectDeps = dependencies.filter((dependency) => projectTaskIds.has(dependency.taskId));
      const graph = new TaskGraph(projectTasks, projectDeps);
      const entry = stats.get(projectId);
      for (const task of projectTasks) {
        if (task.status === TaskStatus.NOT_STARTED) entry.notStarted += 1;
        if (task.status === TaskStatus.IN_PROGRESS) entry.inProgress += 1;
        if (task.status === TaskStatus.DONE) entry.done += 1;
        if (graph.isLate(task, today)) entry.lateTasks += 1;
        if (graph.isBlocked(task)) entry.blockedTasks += 1;
      }
      const total = projectTasks.length;
      entry.percentageDone = total ? Math.round((entry.done / total) * 100) : 0;
    }
    return stats;
  }

  private async loadGraph(projectId: string, manager?: EntityManager) {
    const taskRepo = manager ? manager.getRepository(Task) : this.taskRepository;
    const depRepo = manager ? manager.getRepository(TaskDependency) : this.taskDependencyRepository;
    const tasks = await taskRepo.find({ where: { projectId } });
    const dependencies = tasks.length
      ? await depRepo.find({ where: { taskId: In(tasks.map((task) => task.id)) } })
      : [];
    return new TaskGraph(tasks, dependencies);
  }

  private async requireTask(projectId: string, taskCode: string, graph: TaskGraph) {
    const task = await this.taskRepository.findOneBy({ projectId, code: taskCode });
    if (!task || !graph.getTask(task.id)) {
      throw new NotFoundException();
    }
    return task;
  }

  private async getProjectTask(userId: string, projectCode: string, taskCode: string) {
    const { project } = await this.accessService.assertCanAccessProject(userId, projectCode);
    const task = await this.taskRepository.findOneBy({ projectId: project.id, code: taskCode });
    if (!task) {
      throw new NotFoundException();
    }
    return task;
  }

  private toListItem(task: Task, graph: TaskGraph, today: string) {
    const dependsOn = graph.getDirectDependsOn(task.id).map((id) => {
      const other = graph.getTask(id);
      return { id: other.code, name: other.name, status: other.status };
    });
    return {
      id: task.code,
      name: task.name,
      plannedStartDate: task.plannedStartDate,
      plannedEndDate: task.plannedEndDate,
      status: task.status,
      late: graph.isLate(task, today),
      blocked: graph.isBlocked(task),
      dependsOn,
      dependentCount: graph.getDirectDependents(task.id).length,
    };
  }

  private assertValidDates(plannedStartDate: string, plannedEndDate: string) {
    if (new Date(plannedEndDate) < new Date(plannedStartDate)) {
      throw new BadRequestException('Planned end date cannot be before planned start date');
    }
  }
}
