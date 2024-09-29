import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CategoryDTO } from './types/CategoryDTO';
import slugify from 'slugify';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource
  ) {}
  async create({ name }: CategoryDTO, username: string) {
    try {
      name = name.trim();
      const slug = slugify(name);
      await this.dataSource.query<{ slug: string }[]>(
        `
      INSERT INTO categories (slug, name, "userUsername") VALUES ($1, $2, $3);
      `,
        [slug, name, username]
      );
      return slug;
    } catch (error) {
      if (typeof error.code === 'string' && error.code === '23505') {
        throw new ConflictException(
          'a category with the same name already exists'
        );
      } else throw error;
    }
  }
  async get() {
    const res = await this.dataSource.query<{ slug: string; name: string }[]>(
      `
      SELECT slug, name FROM categories;
      `
    );
    return res;
  }
  async delete(slug: string, username: string) {
    const owner = await this.dataSource.query<{ username: string }[]>(
      `
      SELECT "userUsername" as username FROM categories WHERE slug=$1 LIMIT 1;
      `,
      [slug]
    );
    if (!owner.length) {
      throw new NotFoundException('category not found');
    }
    if (owner[0].username !== username) {
      throw new HttpException(
        'you can only delete your own categories',
        HttpStatus.FORBIDDEN
      );
    }
    await this.dataSource.query(
      `
      UPDATE posts SET "categorySlug"=NULL WHERE "categorySlug"=$1
      `,
      [slug]
    );
    await this.dataSource.query(
      `
      DELETE FROM posts_subcategories_subcategories 
      WHERE posts_subcategories_subcategories."subcategoriesSlug" IN
        (SELECT slug as "subcategoriesSlug" FROM subcategories WHERE "categorySlug"=$1)
      `,
      [slug]
    );
    await this.dataSource.query(
      `
      DELETE FROM subcategories WHERE "categorySlug"=$1;
      `,
      [slug]
    );
    await this.dataSource.query(
      `
        DELETE FROM categories WHERE slug=$1;
        `,
      [slug]
    );
  }
}
