import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class UpdateMemberDto {
    @ApiProperty({ required: true, example: true })
    @IsBoolean()
    isAdmin: boolean;
}
