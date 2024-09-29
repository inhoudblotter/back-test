import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { JwtService } from '@nestjs/jwt';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import slugify from 'slugify';
import { DataSource } from 'typeorm';
import { createTestApp } from 'test/utils/createTestApp';
import { createUser } from 'test/utils/createUser';

describe('Categories controller', () => {
  const categoryName = 'новая категория';
  const subcategory = 'новая подкатегория';
  const categories = ['категория 1', 'категория 2', 'категория 3'].map((v) => ({
    slug: slugify(v),
    name: v
  }));
  const posts = [
    { title: 'пост-1', body: 'текст поста 1' },
    { title: 'пост-2', body: 'текст поста 2' }
  ];

  const user1 = 'test-1';
  let token1: string;
  const user2 = 'test-2';
  let token2: string;

  let app: NestFastifyApplication;
  let db: DataSource;

  beforeAll(async () => {
    const { app: _app, module } = await createTestApp({
      controllers: [CategoriesController],
      providers: [CategoriesService]
    });
    app = _app;
    db = module.get(DataSource);

    const jwt = module.get(JwtService);
    token1 = jwt.sign({ username: user1 });
    token2 = jwt.sign({ username: user2 });
    await Promise.all([
      createUser({ dataSource: db, username: user1 }),
      createUser({ dataSource: db, username: user2 })
    ]);
  });
  afterAll(async () => {
    await db.query(
      `
      DELETE FROM categories WHERE "userUsername" = ANY($1);
      `,
      [[user1, user2]]
    );
    await db.query(
      `
      DELETE FROM users WHERE username = ANY($1);
      `,
      [[user1, user2]]
    );
    await app.close();
  });

  describe('create category', () => {
    afterAll(async () => {
      await db.query(
        `
        DELETE FROM categories WHERE slug=$1
        `,
        [slugify(categoryName)]
      );
    });
    it('unique category created', async () => {
      const res = await app
        .inject()
        .post('categories')
        .body({ name: categoryName })
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(201);
      expect((await res.json()).slug).toBe(slugify(categoryName));
    });
    it('a category with same key not created', async () => {
      const res = await app
        .inject()
        .post('categories')
        .body({ name: categoryName })
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(409);
    });
    it('an unauthorized user cannot create a category', async () => {
      const res = await app
        .inject()
        .post('categories')
        .body({ name: categoryName })
        .cookies({
          token:
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIiLCJpYXQiOjE3Mjc0NTg1OTMsImV4cCI6MTcyNzQ1OTc5NCwiYXVkIjoiIiwic3ViIjoiIiwidXNlcm5hbWUiOiJKb2hubnkifQ.J-jUu2ICbw8b61vDABN5f_hCiCm-x1RAWzJGwrC4BOQ'
        });
      expect(res.statusCode).toBe(401);
    });
    it("can't create a category without a name", async () => {
      const res = await app
        .inject()
        .post('categories')
        .body({})
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(400);
    });
    it("can't be created with a name that is too long", async () => {
      const res = await app
        .inject()
        .post('categories')
        .body({
          name: 'Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit...'
        })
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('delete category', () => {
    beforeAll(async () => {
      await db.query(
        `
        INSERT INTO categories (slug, name, "userUsername") VALUES ($1, $2, $3);
        `,
        [slugify(categoryName), categoryName, user1]
      );
    });
    afterAll(async () => {
      await db.query(
        `
        DELETE FROM categories WHERE slug=$1;
        `,
        [slugify(categoryName)]
      );
    });
    it('an unauthorized user cannot delete a category', async () => {
      const res = await app
        .inject()
        .delete(`categories/${slugify(categoryName)}`)
        .cookies({
          token:
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIiLCJpYXQiOjE3Mjc0NTg1OTMsImV4cCI6MTcyNzQ1OTc5NCwiYXVkIjoiIiwic3ViIjoiIiwidXNlcm5hbWUiOiJKb2hubnkifQ.J-jUu2ICbw8b61vDABN5f_hCiCm-x1RAWzJGwrC4BOQ'
        });
      expect(res.statusCode).toBe(401);
    });
    it('a user cannot delete a category that is not his own', async () => {
      const res = await app
        .inject()
        .delete(`categories/${slugify(categoryName)}`)
        .cookies({
          token: token2
        });
      expect(res.statusCode).toBe(403);
    });
    it('category deleted', async () => {
      const res = await app
        .inject()
        .delete(`categories/${slugify(categoryName)}`)
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(200);
    });
    it('deleted category not found', async () => {
      const res = await app
        .inject()
        .delete(`categories/${slugify(categoryName)}`)
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('delete category cascade', () => {
    beforeAll(async () => {
      await db.query(
        `
        INSERT INTO categories (slug, name, "userUsername") VALUES ($1, $2, $3);
        `,
        [slugify(categoryName), categoryName, user1]
      );

      await db.query(
        `
        INSERT INTO subcategories (slug, name, "categorySlug", "userUsername") VALUES ($1, $2, $3, $4);
        `,
        [slugify(subcategory), subcategory, slugify(categoryName), user1]
      );

      await db.query(
        `
        INSERT INTO posts (slug, title, "userUsername", "categorySlug", body) VALUES ($1, $2, $3, $4, $5);
        `,
        [
          slugify(posts[0].title),
          posts[0].title,
          user1,
          slugify(categoryName),
          posts[0].body
        ]
      );

      await db.query(
        `
        INSERT INTO posts_subcategories_subcategories ("postsSlug", "subcategoriesSlug") 
        VALUES ($1, $2);
        `,
        [slugify(posts[0].title), slugify(subcategory)]
      );
    });
    afterAll(async () => {
      await db.query(
        `
        DELETE FROM posts_subcategories_subcategories
        WHERE "postsSlug" = $1 OR "subcategoriesSlug" = $2;
        `,
        [slugify(posts[0].title), slugify(subcategory)]
      );
      await db.query(
        `
        DELETE FROM posts WHERE slug=$1;
        `,
        [slugify(posts[0].title)]
      );
      await db.query(
        `
        DELETE FROM subcategories WHERE slug = $1
        `,
        [slugify(subcategory)]
      );
      await db.query(
        `
        DELETE FROM categories WHERE slug = $1
        `,
        [slugify(categoryName)]
      );
    });
    it('category deleted', async () => {
      const res = await app
        .inject()
        .delete(`categories/${slugify(categoryName)}`)
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(200);
      const _category = await db.query<{ slug: string }[]>(
        `
        SELECT slug FROM categories WHERE slug = $1;
        `,
        [slugify(categoryName)]
      );
      expect(!_category.length).toBeTruthy();
      const _subcategory = await db.query<{ slug: string }[]>(
        `
        SELECT slug FROM subcategories WHERE "categorySlug" = $1 AND slug=$2 LIMIT 1;
        `,
        [slugify(categoryName), slugify(subcategory)]
      );
      expect(!_subcategory.length).toBeTruthy();

      const _post_subcategory = await db.query<{ subcategoriesSlug: string }[]>(
        `
        SELECT "subcategoriesSlug" FROM posts_subcategories_subcategories 
        WHERE "subcategoriesSlug" = $1 AND "postsSlug" = $2 
        LIMIT 1;
        `,
        [slugify(subcategory), slugify(posts[0].title)]
      );
      expect(!_post_subcategory.length).toBeTruthy();

      const _post = await db.query<{ categorySlug: string }>(
        `
        SELECT "categorySlug" FROM posts 
        WHERE slug=$1
        LIMIT 1;
        `,
        [slugify(posts[0].title)]
      );
      expect(_post.categorySlug).toBe(undefined);
    });
  });

  describe('get categories', () => {
    beforeAll(async () => {
      await db.query(
        `
        INSERT INTO categories (slug, name, "userUsername") VALUES ${categories
          .map((_, i) => `($${3 * i + 1}, $${3 * i + 2}, $${3 * i + 3})`)
          .join(',')}
        `,
        categories.reduce((acc, v) => {
          acc.push(v.slug, v.name, user2);
          return acc;
        }, [])
      );
    });
    afterAll(async () => {
      await db.query(
        `
        DELETE FROM categories WHERE slug = ANY($1);
        `,
        [categories.map((c) => c.slug)]
      );
    });
    it('created categories found', async () => {
      const res = await app.inject().get('categories');
      expect(res.statusCode).toBe(200);
      const data = res.json<{ slug: string; name: string }[]>();
      categories.forEach((c) =>
        expect(
          data.findIndex((v) => v.slug === c.slug && v.name === c.name) !== -1
        ).toBeTruthy()
      );
    });
  });
});
