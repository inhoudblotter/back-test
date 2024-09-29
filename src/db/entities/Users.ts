import { Entity, Column, Index, OneToMany } from 'typeorm';
import { Categories } from './Categories';

@Index(['username'], { unique: true })
@Entity()
export class Users {
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: false,
    primary: true
  })
  username: string;

  @Column({ type: 'varchar', length: 256, nullable: false })
  password: string;
}
