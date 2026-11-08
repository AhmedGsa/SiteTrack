import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { Project } from "src/projects/entities/project.entity";

@Entity("task_counters")
export class TaskCounter {
    @PrimaryColumn('uuid')
    projectId: string;

    @Column({ type: "int" })
    lastNumber: number;

    @OneToOne(() => Project, { onDelete: "CASCADE" })
    @JoinColumn({ name: "projectId" })
    project: Project;
}
