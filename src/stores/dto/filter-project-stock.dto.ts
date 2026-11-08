import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";

export class FilterProjectStockDto extends PaginationDto {
    @ApiProperty({ required: false, example: 'Cement' })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiProperty({ required: false, enum: ['name', 'quantity', 'lastDelivery'], default: 'name' })
    @IsOptional()
    @IsIn(['name', 'quantity', 'lastDelivery'])
    sortBy?: 'name' | 'quantity' | 'lastDelivery' = 'name';

    @ApiProperty({ required: false, enum: ['ASC', 'DESC'], default: 'ASC' })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
    @IsIn(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
