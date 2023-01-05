import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { List } from "./list.model";

@Entity()
export class Content {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, name: "provider_id" })
  provider_id: number;

  @Column({ nullable: false, name: "title" })
  title: string;

  @Column({ nullable: false, name: "poster_path" })
  poster_path: string;

  @Column({ nullable: false, name: "type" })
  type: string;

  @Column({ nullable: false, name: "seen" })
  seen: boolean;

  @ManyToMany((type) => List)
  @JoinTable()
  lists: List[];
}
