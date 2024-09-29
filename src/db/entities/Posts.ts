import {
  Entity,
  Column,
  CreateDateColumn,
  Index,
  ManyToMany,
  JoinTable,
  ManyToOne
} from 'typeorm';
import { Categories } from './Categories';
import { Subcategories } from './Subcategories';
import { Users } from './Users';

@Index(['slug'], { unique: true })
@Entity()
export class Posts {
  @Column({ type: 'varchar', length: 70, nullable: false, primary: true })
  slug: string;

  @Column({ type: 'varchar', length: 70, nullable: false })
  title: string;

  @Column({ type: 'varchar', length: 500, nullable: false })
  body: string;

  @ManyToOne((type) => Users, (user) => user.username, { nullable: false })
  user: string;

  @ManyToOne((type) => Categories, (category) => category.slug)
  category: Categories;

  @ManyToMany((type) => Subcategories, (category) => category.slug)
  @JoinTable()
  subcategories: Subcategories[];

  @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMPZ' })
  createdAt: Date;
}
