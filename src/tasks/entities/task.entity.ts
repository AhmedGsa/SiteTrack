import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Project } from "src/projects/entities/project.entity";
import { TaskStatus } from "../enums/task-status.enum";
import { TaskDependency } from "./task-dependency.entity";

@Entity("tasks")
@Index(["projectId", "code"], { unique: true })
@Index(["projectId", "status"])
export class Task {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    projectId: string;

    @Column()
    code: string;

    @Column()
    name: string;

    @Column({ type: "date" })
    plannedStartDate: string;

    @Column({ type: "date" })
    plannedEndDate: string;

    @Column({ type: "enum", enum: TaskStatus, default: TaskStatus.NOT_STARTED })
    status: TaskStatus;

    @ManyToOne(() => Project, { onDelete: "CASCADE" })
    project: Project;

    @OneToMany(() => TaskDependency, (dependency) => dependency.task)
    dependencies: TaskDependency[];

    @OneToMany(() => TaskDependency, (dependency) => dependency.dependsOn)
    dependents: TaskDependency[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
