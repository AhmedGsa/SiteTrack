import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Min } from "class-validator";

export class UpdateReorderPointDto {
    @ApiProperty({ required: true, example: 20 })
    @IsNumber()
    @Min(0)
    reorderPoint: number;
}
