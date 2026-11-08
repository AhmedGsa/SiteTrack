import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsUUID, Min } from "class-validator";

export class DeliveryLineDto {
    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsUUID()
    materialId: string;

    @ApiProperty({ required: true, example: 10 })
    @IsNotEmpty()
    @IsNumber()
    @Min(0.001)
    quantity: number;
}
