import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { AddDependencyDto } from './dto/add-dependency.dto';
import { JwtAccessTokenGuard } from 'src/auth/guards/jwt-access-token.guard';
import { GetCurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserPayload } from 'src/auth/interfaces/user-payload.interface';

@ApiTags('Tasks')
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Post()
  create(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(user.userId, projectId, createTaskDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Get()
  findAll(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Query() filterTasksDto: FilterTasksDto,
  ) {
    return this.tasksService.findAll(user.userId, projectId, filterTasksDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Get(':taskId')
  findOne(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.findOne(user.userId, projectId, taskId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Patch(':taskId')
  update(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user.userId, projectId, taskId, updateTaskDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Delete(':taskId')
  remove(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.remove(user.userId, projectId, taskId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Post(':taskId/start')
  start(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.start(user.userId, projectId, taskId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Post(':taskId/done')
  markDone(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.markDone(user.userId, projectId, taskId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Post(':taskId/reopen')
  reopen(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.reopen(user.userId, projectId, taskId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Post(':taskId/dependencies')
  addDependency(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() addDependencyDto: AddDependencyDto,
  ) {
    return this.tasksService.addDependency(user.userId, projectId, taskId, addDependencyDto.dependsOnTaskId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Delete(':taskId/dependencies/:dependsOnTaskId')
  removeDependency(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('dependsOnTaskId') dependsOnTaskId: string,
  ) {
    return this.tasksService.removeDependency(user.userId, projectId, taskId, dependsOnTaskId);
  }
}
