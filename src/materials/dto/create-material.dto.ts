import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateMaterialDto {
    @ApiProperty({ required: true, example: 'Cement, OPC 50 kg bag' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ required: true, example: 'Cement' })
    @IsNotEmpty()
    @IsString()
    category: string;

    @ApiProperty({ required: true, example: 'bag' })
    @IsNotEmpty()
    @IsString()
    unit: string;
}
