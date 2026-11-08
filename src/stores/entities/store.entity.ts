import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Project } from "src/projects/entities/project.entity";
import { StoreType } from "../enums/store-type.enum";
import { Stock } from "./stock.entity";

@Entity("stores")
@Index("uq_company_store", ["type"], { unique: true, where: `"type" = 'COMPANY'` })
export class Store {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: "enum", enum: StoreType })
    type: StoreType;

    @Index({ unique: true, where: `"projectId" IS NOT NULL` })
    @Column('uuid', { nullable: true })
    projectId: string;

    @ManyToOne(() => Project, { onDelete: "CASCADE", nullable: true })
    project: Project;

    @OneToMany(() => Stock, (stock) => stock.store)
    stocks: Stock[];

    @CreateDateColumn()
    createdAt: Date;
}
