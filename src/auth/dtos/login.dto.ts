import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class LoginDto {
    @ApiProperty({required: true, example: 'test@example.com'})
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({required: true, example: 'password'})
    @IsNotEmpty()
    password: string;
}
