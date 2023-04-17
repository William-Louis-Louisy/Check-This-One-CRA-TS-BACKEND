import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { User } from "./user.model";

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  message: string;

  @Column()
  message_en: string;

  @Column()
  seen: boolean;

  @Column({ nullable: true, default: null })
  updated_at: Date | null;

  @Column({ nullable: true, default: null })
  type: string | null;

  @ManyToOne(() => User, (user) => user.notifications)
  user: User;
}
