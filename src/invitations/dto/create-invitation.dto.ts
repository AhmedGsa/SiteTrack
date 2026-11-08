import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class CreateInvitationDto {
    @ApiProperty({ required: true, example: 'user@example.com' })
    @IsNotEmpty()
    @IsEmail()
    email: string;
}
