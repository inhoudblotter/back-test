import { Entity, Column, Index, ManyToOne } from 'typeorm';
import { Users } from './Users';

@Index(['slug'], { unique: true })
@Entity()
export class Categories {
  @Column({ type: 'varchar', length: 70, primary: true })
  slug: string;

  @ManyToOne((type) => Users, (user) => user.username, { nullable: false })
  user: string;

  @Column({ type: 'varchar', length: 70 })
  name: string;
}
