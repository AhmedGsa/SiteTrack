import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("project_counters")
export class ProjectCounter {
    @PrimaryColumn()
    id: number;

    @Column({ type: "int" })
    lastNumber: number;
}
