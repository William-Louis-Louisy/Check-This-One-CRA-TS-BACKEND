import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
} from "typeorm";
import bcrypt from "bcrypt";
import { List } from "./list.model";

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

  @Column({ nullable: false, name: "password" })
  password: string;

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

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
