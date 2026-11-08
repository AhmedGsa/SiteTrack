import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateMaterialDto {
    @ApiProperty({ required: false, example: 'Cement, OPC 50 kg bag' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ required: false, example: 'Cement' })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiProperty({ required: false, example: 'bag' })
    @IsOptional()
    @IsString()
    unit?: string;
}
