import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
  OneToOne,
  JoinTable,
  JoinColumn,
} from "typeorm";
import { Content } from "./content.model";
import { Tag } from "./tag.model";
import { User } from "./user.model";

@Entity()
export class List {
  // ID
  @PrimaryGeneratedColumn()
  id: number;

  // LIST TYPE
  @Column({ nullable: true, name: "type" })
  type: string;

  // LIST TITLE
  @Column({ nullable: false, name: "title" })
  title: string;

  // LIST DESCRIPTION
  @Column({ nullable: false, name: "description" })
  description: string;

  // LIST CREATION DATE
  @Column({ nullable: false, name: "creation_date" })
  creation_date: Date;

  // LIST CREATOR
  @Column({ nullable: false, name: "creator_id" })
  creator_id: number;

  @ManyToOne((type) => User, (user) => user.lists)
  @JoinColumn({ name: "creatorId" })
  creator: User;

  // LIST TAGS
  @ManyToMany(() => Tag)
  @JoinTable()
  tags: Tag[];

  // LIST LIKES
  @Column({ nullable: false, name: "likes" })
  likes: number;

  // LIST PRIVACY
  @Column({ nullable: false, name: "privacy" })
  privacy: string;

  // LIST ITEMS
  @ManyToMany((type) => Content, (content) => content.lists, {
    eager: true,
    cascade: true,
  })
  @JoinTable()
  content: Content[];
}
