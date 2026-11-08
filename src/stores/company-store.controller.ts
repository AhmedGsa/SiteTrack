import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { JwtAccessTokenGuard } from 'src/auth/guards/jwt-access-token.guard';
import { GetCurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserPayload } from 'src/auth/interfaces/user-payload.interface';
import { FilterCompanyStockDto } from './dto/filter-company-stock.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { UpdateReorderPointDto } from './dto/update-reorder-point.dto';

@ApiTags('Company store')
@Controller('company-store')
export class CompanyStoreController {
  constructor(private readonly storesService: StoresService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Get('stock')
  getStock(@GetCurrentUser() user: UserPayload, @Query() filterDto: FilterCompanyStockDto) {
    return this.storesService.getCompanyStock(user.userId, filterDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Post('stock')
  addStock(@GetCurrentUser() user: UserPayload, @Body() addStockDto: AddStockDto) {
    return this.storesService.addCompanyStock(user.userId, addStockDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Patch('stock/:materialId/reorder-point')
  updateReorderPoint(
    @GetCurrentUser() user: UserPayload,
    @Param('materialId') materialId: string,
    @Body() updateReorderPointDto: UpdateReorderPointDto,
  ) {
    return this.storesService.updateReorderPoint(user.userId, materialId, updateReorderPointDto);
  }
}
