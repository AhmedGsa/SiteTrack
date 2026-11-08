import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class UpdateTaskDto {
    @ApiProperty({ required: false, example: 'Pour level 2 slab' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ required: false, example: '2026-05-02' })
    @IsOptional()
    @IsDateString()
    plannedStartDate?: string;

    @ApiProperty({ required: false, example: '2026-06-01' })
    @IsOptional()
    @IsDateString()
    plannedEndDate?: string;
}
