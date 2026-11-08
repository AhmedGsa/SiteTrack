import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "src/users/entities/user.entity";
import { Invitation } from "src/invitations/entities/invitation.entity";
import { NotificationType } from "../enums/notification-type.enum";

@Entity("notifications")
@Index(["userId", "createdAt"])
@Index(["userId", "readAt"])
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    userId: string;

    @Column({ type: "enum", enum: NotificationType })
    type: NotificationType;

    @Column('uuid', { nullable: true })
    invitationId: string;

    @Column({ type: "timestamptz", nullable: true })
    readAt: Date;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    user: User;

    @ManyToOne(() => Invitation, (invitation) => invitation.notifications, { onDelete: "CASCADE", nullable: true })
    invitation: Invitation;

    @CreateDateColumn()
    createdAt: Date;
}
