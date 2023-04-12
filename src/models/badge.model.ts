import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { UnlockedBadge } from "./unlockedBadge.model";

@Entity()
export class Badge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  name_en: string;

  @Column()
  description: string;

  @Column()
  description_en: string;

  @Column()
  icon: string;

  @OneToMany(() => UnlockedBadge, (unlockedBadge) => unlockedBadge.badge)
  unlocked_badges: UnlockedBadge[];
}
