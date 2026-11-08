import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class AddDependencyDto {
    @ApiProperty({ required: true, example: 'PRJ-0001-T-0001' })
    @IsNotEmpty()
    @IsString()
    dependsOnTaskId: string;
}
