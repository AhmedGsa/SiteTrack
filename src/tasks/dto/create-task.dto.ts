import { ApiProperty } from "@nestjs/swagger";
import { ArrayUnique, IsArray, IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTaskDto {
    @ApiProperty({ required: true, example: 'Pour level 2 slab' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ required: true, example: '2026-05-02' })
    @IsNotEmpty()
    @IsDateString()
    plannedStartDate: string;

    @ApiProperty({ required: true, example: '2026-06-01' })
    @IsNotEmpty()
    @IsDateString()
    plannedEndDate: string;

    @ApiProperty({ required: false, example: ['PRJ-0001-T-0001'], type: [String] })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    dependsOn?: string[];
}
