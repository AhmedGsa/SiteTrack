import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Project } from "./project.entity";
import { User } from "src/users/entities/user.entity";

@Entity("project_members")
@Unique(["projectId", "userId"])
@Index(["userId"])
export class ProjectMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    projectId: string;

    @Column('uuid')
    userId: string;

    @Column({ default: false })
    isAdmin: boolean;

    @ManyToOne(() => Project, (project) => project.members, { onDelete: "CASCADE" })
    project: Project;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    user: User;

    @CreateDateColumn()
    createdAt: Date;
}
