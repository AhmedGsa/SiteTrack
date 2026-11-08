import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsIn, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { StockStatus } from "../enums/stock-status.enum";

export class FilterCompanyStockDto extends PaginationDto {
    @ApiProperty({ required: false, example: 'Cement' })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiProperty({ required: false, enum: StockStatus })
    @IsOptional()
    @IsEnum(StockStatus)
    status?: StockStatus;

    @ApiProperty({ required: false, enum: ['name', 'quantity', 'status'], default: 'name' })
    @IsOptional()
    @IsIn(['name', 'quantity', 'status'])
    sortBy?: 'name' | 'quantity' | 'status' = 'name';

    @ApiProperty({ required: false, enum: ['ASC', 'DESC'], default: 'ASC' })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
    @IsIn(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
