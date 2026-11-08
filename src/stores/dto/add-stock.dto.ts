import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsUUID, Min } from "class-validator";

export class AddStockDto {
    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsUUID()
    materialId: string;

    @ApiProperty({ required: true, example: 100 })
    @IsNotEmpty()
    @IsNumber()
    @Min(0.001)
    quantity: number;
}
