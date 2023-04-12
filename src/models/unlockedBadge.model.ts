import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Badge } from "./badge.model";
import { User } from "./user.model";

@Entity()
export class UnlockedBadge {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.unlocked_badges)
  user: User;

  @ManyToOne(() => Badge, (badge) => badge.unlocked_badges)
  badge: Badge;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  unlocked_at: Date;
}
