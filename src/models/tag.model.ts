import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from "typeorm";
import { List } from "./list.model";

@Entity()
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  name_fr: string;

  @ManyToMany((type) => List, (list) => list.tags)
  lists: List[];
}
