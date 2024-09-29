import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Posts } from './entities/Posts';
import { Users } from './entities/Users';
import { Categories } from './entities/Categories';
import { Subcategories } from './entities/Subcategories';
import { config } from 'dotenv';
config({ override: false });

const source: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  synchronize: true,
  logging: process.env.MODE_ENV !== 'production',
  entities: [Users, Categories, Posts, Subcategories],
  migrations: ['./dist/db/migration/*{.ts,.js}'],
  ssl: Boolean(process.env.DB_SSL)
};

export default source;
