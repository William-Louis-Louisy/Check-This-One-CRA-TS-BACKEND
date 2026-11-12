import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BeforeInsert,
  OneToMany,
  ManyToMany,
  JoinTable,
} from "typeorm";
import bcrypt from "bcrypt";
import { UserRole } from "../middlewares/authorization.policy";
import { List } from "./list.model";
import { Content } from "./content.model";
import { UnlockedBadge } from "./unlockedBadge.model";
import { Notification } from "./notification.model";

@Entity()
export class User {
  save() {
    throw new Error("Method not implemented.");
  }
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, name: "user_name", unique: true })
  user_name: string;

  @Column({ nullable: false, name: "email", unique: true })
  email: string;

  @Column({ nullable: false, name: "password", select: false })
  password: string;

  @Column({ type: "varchar", length: 16, default: "user" })
  role: UserRole;

  // A logout invalidates every previously issued JWT for this account.
  @Column({ type: "int", unsigned: true, default: 0 })
  session_version: number;

  @Column({ type: "longtext", nullable: true, name: "avatar" })
  avatar: string;

  @Column({ nullable: true, name: "country" })
  country: string;

  @Column({ nullable: true, name: "city" })
  city: string;

  @Column({ nullable: true, name: "introduction" })
  introduction: string;

  @Column({ nullable: true, name: "catchline" })
  catchline: string;

  @OneToMany(() => List, (list) => list.creator)
  lists: List[];

  @ManyToMany(() => List, (list) => list.liked_by)
  @JoinTable()
  liked_lists: List[];

  @ManyToMany(() => Content, (content) => content.seen_by)
  @JoinTable()
  seen_content: Content[];

  @OneToMany(() => UnlockedBadge, (unlockedBadge) => unlockedBadge.user)
  unlocked_badges: UnlockedBadge[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @Column({ name: "reset_password_token", nullable: true, select: false })
  reset_password_token: string;

  @Column({ name: "reset_password_expires", nullable: true, select: false })
  reset_password_expires: Date;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
