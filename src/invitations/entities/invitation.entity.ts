import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Project } from "src/projects/entities/project.entity";
import { User } from "src/users/entities/user.entity";
import { InvitationStatus } from "../enums/invitation-status.enum";
import { Notification } from "src/notifications/entities/notification.entity";

@Entity("invitations")
@Index(["projectId", "inviteeId"], { unique: true, where: `"status" = 'PENDING'` })
@Index(["inviteeId", "status"])
export class Invitation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    projectId: string;

    @Column('uuid')
    inviterId: string;

    @Column('uuid')
    inviteeId: string;

    @Column({ type: "enum", enum: InvitationStatus, default: InvitationStatus.PENDING })
    status: InvitationStatus;

    @ManyToOne(() => Project, { onDelete: "CASCADE" })
    project: Project;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    inviter: User;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    invitee: User;

    @OneToMany(() => Notification, (notification) => notification.invitation)
    notifications: Notification[];

    @Column({ type: "timestamptz", nullable: true })
    answeredAt: Date;

    @CreateDateColumn()
    createdAt: Date;
}
