import { User } from "src/users/entities/user.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity("sessions")
export class Session {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @Column()
    refreshTokenHash: string;

    @CreateDateColumn()
    createdAt: Date;
}
