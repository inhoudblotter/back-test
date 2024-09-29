import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import slugify from 'slugify';
import { PostDTO } from './types/PostDTO';
import { PostQuery } from './types/PostQuery';
import { IPost } from './types/IPost';

@Injectable()
export class PostsService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource
  ) {}

  async create(
    { title, category, subcategories, body }: PostDTO,
    username: string
  ) {
    title = title.trim();
    body = body.trim();
    const slug = slugify(title);
    try {
      if (category) {
        await this.dataSource.query(
          `
          INSERT INTO categories (slug, name, "userUsername") VALUES ($1, $2, $3) 
          ON CONFLICT DO NOTHING;
          `,
          [slugify(category), category, username]
        );
      }
      await this.dataSource.query(
        `
        INSERT INTO posts (slug, title, body, "userUsername", "categorySlug") VALUES ($1, $2, $3, $4, $5);
        `,
        [slug, title, body, username, category ? slugify(category) : null]
      );
      if (subcategories && subcategories.length) {
        const categories = await this.dataSource.query<
          { categorySlug: string }[]
        >(
          `
          SELECT "categorySlug" FROM subcategories WHERE slug = ANY($1);
          `,
          [subcategories.map((sc) => slugify(sc))]
        );
        if (!category && categories[0]?.categorySlug)
          category = categories[0].categorySlug;
        if (subcategories.length !== categories.length && !category) {
          throw new ConflictException(
            'specify a category to create a new subcategory'
          );
        } else if (category) {
          await this.dataSource.query(
            `
          INSERT INTO subcategories ("categorySlug", "userUsername", slug, name) 
          VALUES ${subcategories.map((_, i) => `($1, $2, $${i * 2 + 3}, $${i * 2 + 4})`)}
          ON CONFLICT DO NOTHING;
          `,
            [
              slugify(category),
              username,
              ...subcategories.reduce((acc, v) => {
                acc.push(slugify(v), v);
                return acc;
              }, [])
            ]
          );
        }

        await this.dataSource.query(
          `
          INSERT INTO posts_subcategories_subcategories ("postsSlug", "subcategoriesSlug") 
          VALUES ${subcategories.map((_, i) => `($1, $${i + 2})`).join(', ')}
          ON CONFLICT DO NOTHING;
          `,
          [slug, ...subcategories.map((sc) => slugify(sc))]
        );
      }
      return slug;
    } catch (error) {
      if (typeof error.code === 'string' && error.code === '23505') {
        throw new ConflictException(
          'a post with the same title already exists'
        );
      } else throw error;
    }
  }

  async get({ category, subcategories }: PostQuery) {
    const values = [];
    let categoryFilter: string;
    let subcategoriesFilter: string;
    if (category) {
      values.push(category);
      categoryFilter = `WHERE c.slug = $${values.length}`;
    }
    if (subcategories && subcategories.length) {
      values.push(subcategories);
      subcategoriesFilter = `WHERE slug = ANY($${values.length})`;
    }
    const res = await this.dataSource.query<
      IPost[]
    >(
      `
      SELECT posts.slug, posts.body, posts.title, posts."createdAt", posts."userUsername" as username, 
      json_build_object('slug', c.slug, 'name', c.name) as category, 
      sub_c.sub_c_arr as subcategories
      FROM posts
      LEFT JOIN categories c ON c.slug="categorySlug"
      ${subcategoriesFilter ? 'RIGHT' :  'LEFT'} JOIN (
        SELECT array_agg(json_build_object('slug', subcategories.slug, 'name', 
        subcategories.name, 'category', subcategories."categorySlug")) as sub_c_arr, "postsSlug"  
        FROM posts_subcategories_subcategories
        LEFT JOIN subcategories ON subcategories.slug="subcategoriesSlug"
        ${subcategoriesFilter || ''}
        GROUP BY "postsSlug"
        ) sub_c ON sub_c."postsSlug"=posts.slug
        ${categoryFilter ? categoryFilter : ''}
      `, values
    );
    return res;
  }

  async delete(slug: string, username: string) {
    const owner = await this.dataSource.query<{ username: string }[]>(
      `
      SELECT "userUsername" as username FROM posts WHERE slug=$1 LIMIT 1;
      `,
      [slug]
    );
    if (!owner.length) {
      throw new NotFoundException('post not found');
    } else if (owner[0].username !== username) {
      throw new HttpException(
        'you can only delete your own posts',
        HttpStatus.FORBIDDEN
      );
    }
    await this.dataSource.query(
      `
        DELETE FROM posts WHERE slug=$1;
        `,
      [slug]
    );
  }
}
