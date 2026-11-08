import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { DeliveryLineDto } from "./delivery-line.dto";

export class CreateCompanyDeliveryDto {
    @ApiProperty({ required: true, example: 'PRJ-0001' })
    @IsNotEmpty()
    @IsString()
    projectId: string;

    @ApiProperty({ type: [DeliveryLineDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => DeliveryLineDto)
    lines: DeliveryLineDto[];
}
