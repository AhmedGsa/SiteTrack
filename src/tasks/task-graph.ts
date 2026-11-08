import { Task } from './entities/task.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { TaskStatus } from './enums/task-status.enum';

export class TaskGraph {
  private readonly tasksById: Map<string, Task>;
  private readonly dependsOn = new Map<string, string[]>();
  private readonly dependents = new Map<string, string[]>();

  constructor(tasks: Task[], dependencies: TaskDependency[]) {
    this.tasksById = new Map(tasks.map((task) => [task.id, task]));
    for (const task of tasks) {
      this.dependsOn.set(task.id, []);
      this.dependents.set(task.id, []);
    }
    for (const dependency of dependencies) {
      this.dependsOn.get(dependency.taskId)?.push(dependency.dependsOnTaskId);
      this.dependents.get(dependency.dependsOnTaskId)?.push(dependency.taskId);
    }
  }

  getTask(id: string) {
    return this.tasksById.get(id);
  }

  getDirectDependsOn(taskId: string) {
    return this.dependsOn.get(taskId) || [];
  }

  getDirectDependents(taskId: string) {
    return this.dependents.get(taskId) || [];
  }

  waitsOnDistances(taskId: string) {
    return this.collectReachable(taskId, this.dependsOn);
  }

  waitedOnByDistances(taskId: string) {
    return this.collectReachable(taskId, this.dependents);
  }

  wouldCreateCycle(taskId: string, dependsOnTaskId: string) {
    if (taskId === dependsOnTaskId) {
      return true;
    }
    return this.waitsOnDistances(dependsOnTaskId).has(taskId);
  }

  isLate(task: Task, today: string) {
    if (task.status === TaskStatus.DONE) {
      return false;
    }
    if (task.plannedEndDate < today) {
      return true;
    }
    return task.status === TaskStatus.NOT_STARTED && task.plannedStartDate < today;
  }

  isBlocked(task: Task) {
    if (task.status === TaskStatus.DONE) {
      return false;
    }
    for (const id of this.waitsOnDistances(task.id).keys()) {
      const other = this.tasksById.get(id);
      if (other && other.status !== TaskStatus.DONE) {
        return true;
      }
    }
    return false;
  }

  canStart(task: Task) {
    if (task.status !== TaskStatus.NOT_STARTED) {
      return false;
    }
    for (const id of this.waitsOnDistances(task.id).keys()) {
      const other = this.tasksById.get(id);
      if (!other || other.status !== TaskStatus.DONE) {
        return false;
      }
    }
    return true;
  }

  canMarkDone(task: Task) {
    return task.status === TaskStatus.IN_PROGRESS;
  }

  canReopen(task: Task) {
    if (task.status !== TaskStatus.DONE) {
      return false;
    }
    for (const id of this.waitedOnByDistances(task.id).keys()) {
      const other = this.tasksById.get(id);
      if (other && other.status !== TaskStatus.NOT_STARTED) {
        return false;
      }
    }
    return true;
  }

  allowedActions(task: Task) {
    const actions: string[] = [];
    if (this.canStart(task)) {
      actions.push('start');
    }
    if (this.canMarkDone(task)) {
      actions.push('done');
    }
    if (this.canReopen(task)) {
      actions.push('reopen');
    }
    return actions;
  }

  private collectReachable(startId: string, adjacency: Map<string, string[]>) {
    const dist = new Map<string, number>();
    const queue = [startId];
    dist.set(startId, 0);
    while (queue.length) {
      const current = queue.shift();
      for (const next of adjacency.get(current) || []) {
        if (!dist.has(next)) {
          dist.set(next, dist.get(current) + 1);
          queue.push(next);
        }
      }
    }
    dist.delete(startId);
    return dist;
  }
}

export function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}
