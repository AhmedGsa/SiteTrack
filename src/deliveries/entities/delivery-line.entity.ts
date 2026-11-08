import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Delivery } from "./delivery.entity";
import { Material } from "src/materials/entities/material.entity";

@Entity("delivery_lines")
@Unique(["deliveryId", "materialId"])
@Index(["materialId"])
export class DeliveryLine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    deliveryId: string;

    @Column('uuid')
    materialId: string;

    @Column({ type: "numeric", precision: 12, scale: 3 })
    quantity: string;

    @ManyToOne(() => Delivery, (delivery) => delivery.lines, { onDelete: "CASCADE" })
    delivery: Delivery;

    @ManyToOne(() => Material, { onDelete: "RESTRICT" })
    material: Material;
}
