import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ProjectMember } from "./project-member.entity";

@Entity("projects")
export class Project {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index({ unique: true })
    @Column({ unique: true })
    code: string;

    @Column()
    name: string;

    @Column({ type: "date" })
    plannedStartDate: string;

    @Column({ type: "date" })
    plannedEndDate: string;

    @OneToMany(() => ProjectMember, (member) => member.project)
    members: ProjectMember[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
