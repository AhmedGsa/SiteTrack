import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class UpdateProjectDto {
    @ApiProperty({ required: false, example: 'Riverside Tower' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ required: false, example: '2026-03-01' })
    @IsOptional()
    @IsDateString()
    plannedStartDate?: string;

    @ApiProperty({ required: false, example: '2026-12-15' })
    @IsOptional()
    @IsDateString()
    plannedEndDate?: string;
}
