import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Store } from "./store.entity";
import { Material } from "src/materials/entities/material.entity";

@Entity("stocks")
@Unique(["storeId", "materialId"])
@Index(["storeId"])
@Index(["materialId"])
export class Stock {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    storeId: string;

    @Column('uuid')
    materialId: string;

    @Column({ type: "numeric", precision: 12, scale: 3, default: 0 })
    quantity: string;

    @Column({ type: "numeric", precision: 12, scale: 3, nullable: true })
    reorderPoint: string;

    @Column({ type: "timestamptz", nullable: true })
    lastDeliveryAt: Date;

    @ManyToOne(() => Store, (store) => store.stocks, { onDelete: "CASCADE" })
    store: Store;

    @ManyToOne(() => Material, { onDelete: "RESTRICT" })
    material: Material;

    @UpdateDateColumn()
    updatedAt: Date;
}
