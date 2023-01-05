import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Show {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, name: "tmdb_id" })
  tmdb_id: number;

  @Column({ nullable: false, name: "title" })
  title: string;

  @Column({ nullable: false, name: "poster_path" })
  poster_path: string;
}
