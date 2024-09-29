import {
  Entity,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  ManyToMany
} from 'typeorm';
import { Categories } from './Categories';
import { Users } from './Users';
import { Posts } from './Posts';

@Index(['slug'], { unique: true })
@Entity()
export class Subcategories {
  @Column({ type: 'varchar', length: 70, primary: true })
  slug: string;

  @Column({ type: 'varchar', length: 70 })
  name: string;

  @ManyToOne((type) => Categories, (category) => category.slug, {
    nullable: false
  })
  category: string;

  @ManyToOne((type) => Users, (user) => user.username, { nullable: false })
  user: string;

  @ManyToMany((type) => Posts, (post) => post.slug)
  post: string;
}
