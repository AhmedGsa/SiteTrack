import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";

export class FilterMaterialsDto extends PaginationDto {
    @ApiProperty({ required: false, example: 'Cement' })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiProperty({ required: false, enum: ['name', 'category'], default: 'name' })
    @IsOptional()
    @IsIn(['name', 'category'])
    sortBy?: 'name' | 'category' = 'name';

    @ApiProperty({ required: false, enum: ['ASC', 'DESC'], default: 'ASC' })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
    @IsIn(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
