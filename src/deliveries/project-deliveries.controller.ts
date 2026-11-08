import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DeliveriesService } from './deliveries.service';
import { JwtAccessTokenGuard } from 'src/auth/guards/jwt-access-token.guard';
import { GetCurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserPayload } from 'src/auth/interfaces/user-payload.interface';
import { CreateProjectDeliveryDto } from './dto/create-project-delivery.dto';
import { FilterDeliveriesDto } from './dto/filter-deliveries.dto';

@ApiTags('Project deliveries')
@Controller('projects/:projectId/deliveries')
export class ProjectDeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Post()
  create(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Body() createDto: CreateProjectDeliveryDto,
  ) {
    return this.deliveriesService.createFromProject(user.userId, projectId, createDto.lines);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Get()
  findAll(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Query() filterDto: FilterDeliveriesDto,
  ) {
    return this.deliveriesService.findProjectDeliveries(user.userId, projectId, filterDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Post(':id/record')
  record(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.deliveriesService.record(user.userId, id, { projectCode: projectId });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Post(':id/reject')
  reject(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.deliveriesService.reject(user.userId, id, { projectCode: projectId });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Post(':id/cancel')
  cancel(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.deliveriesService.cancel(user.userId, id, { projectCode: projectId });
  }
}
