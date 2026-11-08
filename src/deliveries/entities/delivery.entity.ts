import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { DeliveryStatus } from "../enums/delivery-status.enum";
import { DeliveryDirection } from "../enums/delivery-direction.enum";
import { Project } from "src/projects/entities/project.entity";
import { User } from "src/users/entities/user.entity";
import { DeliveryLine } from "./delivery-line.entity";

@Entity("deliveries")
@Index(["projectId", "sentAt"])
@Index(["status", "sentAt"])
@Index(["direction", "status", "sentAt"])
export class Delivery {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: "enum", enum: DeliveryDirection })
    direction: DeliveryDirection;

    @Column({ type: "enum", enum: DeliveryStatus })
    status: DeliveryStatus;

    @Column('uuid')
    projectId: string;

    @Column('uuid')
    senderUserId: string;

    @Column('uuid', { nullable: true })
    receiverUserId: string;

    @Column({ type: "timestamptz" })
    sentAt: Date;

    @Column({ type: "timestamptz", nullable: true })
    receivedAt: Date;

    @ManyToOne(() => Project, { onDelete: "CASCADE" })
    project: Project;

    @ManyToOne(() => User, { onDelete: "RESTRICT" })
    sender: User;

    @ManyToOne(() => User, { onDelete: "RESTRICT", nullable: true })
    receiver: User;

    @OneToMany(() => DeliveryLine, (line) => line.delivery, { cascade: true })
    lines: DeliveryLine[];

    @CreateDateColumn()
    createdAt: Date;
}
