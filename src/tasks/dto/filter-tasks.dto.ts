import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsIn, IsOptional } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { TaskStatus } from "../enums/task-status.enum";

export class FilterTasksDto extends PaginationDto {
    @ApiProperty({ required: false, enum: TaskStatus })
    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @ApiProperty({ required: false, default: false })
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    late?: boolean;

    @ApiProperty({ required: false, default: false })
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    blocked?: boolean;

    @ApiProperty({ required: false, example: '2026-03-01' })
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiProperty({ required: false, example: '2026-12-31' })
    @IsOptional()
    @IsDateString()
    to?: string;

    @ApiProperty({ required: false, enum: ['id', 'name', 'startDate', 'endDate', 'dependentCount'], default: 'id' })
    @IsOptional()
    @IsIn(['id', 'name', 'startDate', 'endDate', 'dependentCount'])
    sortBy?: 'id' | 'name' | 'startDate' | 'endDate' | 'dependentCount' = 'id';

    @ApiProperty({ required: false, enum: ['ASC', 'DESC'], default: 'ASC' })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
    @IsIn(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
