import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { DeliveryLineDto } from "./delivery-line.dto";

export class CreateProjectDeliveryDto {
    @ApiProperty({ type: [DeliveryLineDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => DeliveryLineDto)
    lines: DeliveryLineDto[];
}
