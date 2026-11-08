import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { FilterMaterialsDto } from './dto/filter-materials.dto';
import { JwtAccessTokenGuard } from 'src/auth/guards/jwt-access-token.guard';

@ApiTags('Materials')
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Post()
  create(@Body() createMaterialDto: CreateMaterialDto) {
    return this.materialsService.create(createMaterialDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Get()
  findAll(@Query() filterMaterialsDto: FilterMaterialsDto) {
    return this.materialsService.findAll(filterMaterialsDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Get('categories')
  findCategories() {
    return this.materialsService.findCategories();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.materialsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMaterialDto: UpdateMaterialDto) {
    return this.materialsService.update(id, updateMaterialDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAccessTokenGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.materialsService.remove(id);
  }
}
