import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { List } from "./list.model";
import { User } from "./user.model";

@Entity()
export class Content {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, name: "provider_id" })
  provider_id: number;

  @Column({ nullable: true, name: "provider_id_string" })
  provider_id_string: string;

  @Column({ nullable: false, name: "title" })
  title: string;

  @Column({ nullable: false, name: "poster_path" })
  poster_path: string;

  @Column({ nullable: false, name: "type" })
  type: string;

  @Column({ nullable: false, name: "seen" })
  seen: number;

  @ManyToMany(() => User, (user) => user.seen_content)
  seen_by: User[];

  @ManyToMany((type) => List)
  @JoinTable()
  lists: List[];
}
