import { ApiProperty } from "@nestjs/swagger";
import { IsNumberString, IsOptional, IsString } from "class-validator";

export class PaginationDto {
    @ApiProperty({ required: false, default: 1 })
    @IsOptional()
    @IsNumberString()
    page?: string;

    @ApiProperty({ required: false, default: 10 })
    @IsOptional()
    @IsNumberString()
    pageSize?: string;

    @ApiProperty({ required: false, default: 'search' })
    @IsOptional()
    @IsString()
    search?: string;
}
