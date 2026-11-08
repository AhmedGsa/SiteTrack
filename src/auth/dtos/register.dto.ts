import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";
import { LoginDto } from "./login.dto";
import { Role } from "src/users/enum/role.enum";

export class RegisterDto extends LoginDto {
    @ApiProperty({required: true, example: 'Ahmed Gouasmia'})
    @IsNotEmpty()
    name: string;

    @ApiProperty({ required: true, enum: Role, example: Role.USER})
    @IsNotEmpty()
    @IsEnum(Role)
    role: Role;
}
