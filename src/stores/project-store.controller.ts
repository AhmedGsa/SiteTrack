import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { JwtAccessTokenGuard } from 'src/auth/guards/jwt-access-token.guard';
import { GetCurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserPayload } from 'src/auth/interfaces/user-payload.interface';
import { FilterProjectStockDto } from './dto/filter-project-stock.dto';

@ApiTags('Project store')
@Controller('projects/:projectId/store')
export class ProjectStoreController {
  constructor(private readonly storesService: StoresService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Get()
  getStock(
    @GetCurrentUser() user: UserPayload,
    @Param('projectId') projectId: string,
    @Query() filterDto: FilterProjectStockDto,
  ) {
    return this.storesService.getProjectStock(user.userId, projectId, filterDto);
  }
}
