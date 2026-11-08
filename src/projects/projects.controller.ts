import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessTokenGuard } from 'src/auth/guards/jwt-access-token.guard';
import { GetCurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserPayload } from 'src/auth/interfaces/user-payload.interface';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Post()
  create(@GetCurrentUser() user: UserPayload, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(user.userId, createProjectDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Get()
  findAll(@GetCurrentUser() user: UserPayload, @Query() filterProjectsDto: FilterProjectsDto) {
    return this.projectsService.findAll(user.userId, filterProjectsDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Get(':id')
  findOne(@GetCurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.projectsService.findOne(user.userId, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Patch(':id')
  update(
    @GetCurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(user.userId, id, updateProjectDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Delete(':id')
  remove(@GetCurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.projectsService.remove(user.userId, id);
  }
}
