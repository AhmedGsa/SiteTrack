import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsString } from "class-validator";

export class CreateProjectDto {
    @ApiProperty({ required: true, example: 'Riverside Tower' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ required: true, example: '2026-03-01' })
    @IsNotEmpty()
    @IsDateString()
    plannedStartDate: string;

    @ApiProperty({ required: true, example: '2026-12-15' })
    @IsNotEmpty()
    @IsDateString()
    plannedEndDate: string;
}
