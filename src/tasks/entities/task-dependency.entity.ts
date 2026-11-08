import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Task } from "./task.entity";

@Entity("task_dependencies")
@Unique(["taskId", "dependsOnTaskId"])
@Index(["dependsOnTaskId"])
export class TaskDependency {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    taskId: string;

    @Column('uuid')
    dependsOnTaskId: string;

    @ManyToOne(() => Task, (task) => task.dependencies, { onDelete: "CASCADE" })
    task: Task;

    @ManyToOne(() => Task, (task) => task.dependents, { onDelete: "CASCADE" })
    dependsOn: Task;

    @CreateDateColumn()
    createdAt: Date;
}
