import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Youtube {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, name: "ytb_id" })
  ytb_id: number;

  @Column({ nullable: false, name: "title" })
  title: string;

  @Column({ nullable: false, name: "poster_path" })
  poster_path: string;
}
