import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { DeliveryStatus } from "../enums/delivery-status.enum";
import { DeliveryDirection } from "../enums/delivery-direction.enum";

export class FilterDeliveriesDto extends PaginationDto {
    @ApiProperty({ required: false, enum: DeliveryDirection })
    @IsOptional()
    @IsEnum(DeliveryDirection)
    direction?: DeliveryDirection;

    @ApiProperty({ required: false, enum: DeliveryStatus })
    @IsOptional()
    @IsEnum(DeliveryStatus)
    status?: DeliveryStatus;

    @ApiProperty({ required: false, example: 'PRJ-0001' })
    @IsOptional()
    @IsString()
    projectId?: string;

    @ApiProperty({ required: false, example: '2026-01-01' })
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiProperty({ required: false, example: '2026-12-31' })
    @IsOptional()
    @IsDateString()
    to?: string;
}
