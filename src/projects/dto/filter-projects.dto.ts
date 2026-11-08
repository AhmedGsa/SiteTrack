import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";

export class FilterProjectsDto extends PaginationDto {
    @ApiProperty({ required: false, default: false })
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    lateOnly?: boolean;

    @ApiProperty({ required: false, enum: ['name', 'startDate', 'percentageDone', 'lateTasks'], default: 'name' })
    @IsOptional()
    @IsIn(['name', 'startDate', 'percentageDone', 'lateTasks'])
    sortBy?: 'name' | 'startDate' | 'percentageDone' | 'lateTasks' = 'name';

    @ApiProperty({ required: false, enum: ['ASC', 'DESC'], default: 'ASC' })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
    @IsIn(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
