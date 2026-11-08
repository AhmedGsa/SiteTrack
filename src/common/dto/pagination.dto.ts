import { ApiProperty } from "@nestjs/swagger";
import { IsNumberString, IsOptional, IsString } from "class-validator";

export class PaginationDto {
    @ApiProperty({ required: false, default: 10 })
    @IsOptional()
    @IsNumberString()
    page: number = 1;

    @ApiProperty({ required: false, default: 10 })
    @IsOptional()
    @IsNumberString()
    pageSize: number = 10;

    @ApiProperty({ required: false, default: 'search' })
    @IsOptional()
    @IsString()
    search?: string;
}
