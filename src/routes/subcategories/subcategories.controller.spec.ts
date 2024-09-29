import { JwtService } from '@nestjs/jwt';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import slugify from 'slugify';
import { DataSource } from 'typeorm';
import { createTestApp } from 'test/utils/createTestApp';
import { createUser } from 'test/utils/createUser';
import { SubcategoriesController } from './subcategories.controller';
import { SubcategoriesService } from './subcategories.service';

describe('Sub categories controller', () => {
  const categoryName = 'новая категория';
  const subcategory = 'новая подкатегория';
  const categories = [`категория`, 'категория 2', 'категория 3'].map((v) => ({
    slug: slugify(v),
    name: v
  }));
  const posts = [
    { title: 'пост-1', body: 'текст поста 1' },
    { title: 'пост-2', body: 'текст поста 2' }
  ];
  const postBody = 'текст поста';

  const user1 = 'test-1';
  let token1: string;
  const user2 = 'test-2';
  let token2: string;

  let app: NestFastifyApplication;
  let db: DataSource;

  beforeAll(async () => {
    const { app: _app, module } = await createTestApp({
      controllers: [SubcategoriesController],
      providers: [SubcategoriesService]
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

  describe('create sub category', () => {
    beforeAll(async () => {
      await db.query(
        `
        INSERT INTO categories (slug, name, "userUsername")
        VALUES ($1, $2, $3);
        `,
        [slugify(categoryName), categoryName, user1]
      );
    });
    afterAll(async () => {
      await db.query(
        `
        DELETE FROM subcategories WHERE slug=$1
        `,
        [slugify(subcategory)]
      );
      await db.query(
        `
        DELETE FROM categories WHERE slug=$1;
        `,
        [slugify(categoryName)]
      );
    });
    it('unique subcategory created', async () => {
      const res = await app
        .inject()
        .post('sub-categories')
        .body({ name: subcategory, category: slugify(categoryName) })
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(201);
      expect(res.json().slug).toBe(slugify(subcategory));
    });
    it('a sub category with same key not created', async () => {
      const res = await app
        .inject()
        .post('sub-categories')
        .body({ name: subcategory, category: slugify(categoryName) })
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(409);
    });
    it('an unauthorized user cannot create a sub category', async () => {
      const res = await app
        .inject()
        .post('sub-categories')
        .body({ name: subcategory, category: slugify(categoryName) })
        .cookies({
          token:
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIiLCJpYXQiOjE3Mjc0NTg1OTMsImV4cCI6MTcyNzQ1OTc5NCwiYXVkIjoiIiwic3ViIjoiIiwidXNlcm5hbWUiOiJKb2hubnkifQ.J-jUu2ICbw8b61vDABN5f_hCiCm-x1RAWzJGwrC4BOQ'
        });
      expect(res.statusCode).toBe(401);
    });
    it("can't create a  sub category without a name", async () => {
      const res = await app
        .inject()
        .post('sub-categories')
        .body({ category: slugify(categoryName) })
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(400);
    });

    it("can't create a  sub category without a category", async () => {
      const res = await app
        .inject()
        .post('sub-categories')
        .body({ name: subcategory })
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(400);
    });
    it("can't be created with a name that is too long", async () => {
      const res = await app
        .inject()
        .post('sub-categories')
        .body({
          name: 'Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit...',
          category: slugify(categoryName)
        })
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('delete sub category', () => {
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
    });
    afterAll(async () => {
      await db.query(
        `
        DELETE FROM subcategories WHERE slug=$1;
        `,
        [slugify(subcategory)]
      );
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
        .delete(`sub-categories/${slugify(subcategory)}`)
        .cookies({
          token:
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIiLCJpYXQiOjE3Mjc0NTg1OTMsImV4cCI6MTcyNzQ1OTc5NCwiYXVkIjoiIiwic3ViIjoiIiwidXNlcm5hbWUiOiJKb2hubnkifQ.J-jUu2ICbw8b61vDABN5f_hCiCm-x1RAWzJGwrC4BOQ'
        });
      expect(res.statusCode).toBe(401);
    });
    it('a user cannot delete a category that is not his own', async () => {
      const res = await app
        .inject()
        .delete(`sub-categories/${slugify(subcategory)}`)
        .cookies({
          token: token2
        });
      expect(res.statusCode).toBe(403);
    });
    it('category deleted', async () => {
      const res = await app
        .inject()
        .delete(`sub-categories/${slugify(subcategory)}`)
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(200);
    });
    it('deleted category not found', async () => {
      const res = await app
        .inject()
        .delete(`sub-categories/${slugify(subcategory)}`)
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('delete sub category cascade', () => {
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
        .delete(`sub-categories/${slugify(subcategory)}`)
        .cookies({ token: token1 });
      expect(res.statusCode).toBe(200);

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
    });
  });

  describe('get sub categories', () => {
    beforeAll(async () => {
      await db.query(
        `
        INSERT INTO categories (slug, name, "userUsername") VALUES ($1, $2, $3);
        `,
        [slugify(categoryName), categoryName, user1]
      );
      await db.query(
        `
        INSERT INTO subcategories (slug, name, "categorySlug", "userUsername") VALUES ${categories
          .map(
            (_, i) =>
              `($${4 * i + 1}, $${4 * i + 2}, $${4 * i + 3}, $${4 * i + 4})`
          )
          .join(',')}
        `,
        categories.reduce((acc, v) => {
          acc.push(v.slug, v.name, slugify(categoryName), user1);
          return acc;
        }, [])
      );
    });
    it('created sub categories found', async () => {
      const res = await app.inject().get('sub-categories');
      expect(res.statusCode).toBe(200);
      const data = res.json<{ slug: string; name: string }[]>();
      categories.forEach((c) =>
        expect(
          data.findIndex((v) => v.slug === c.slug && v.name === c.name) !== -1
        ).toBeTruthy()
      );
    });
    afterAll(async () => {
      await db.query(
        `
        DELETE FROM subcategories WHERE slug = ANY($1);
        `,
        [categories.map((c) => c.slug)]
      );
    });
  });
});
