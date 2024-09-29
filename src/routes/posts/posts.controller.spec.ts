import { JwtService } from '@nestjs/jwt';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import slugify from 'slugify';
import { AppModule } from 'src/app.module';
import { createTestApp } from 'test/utils/createTestApp';
import { createUser } from 'test/utils/createUser';
import { DataSource } from 'typeorm';
import { IPost } from './types/IPost';

describe('Posts controller', () => {
  let app: NestFastifyApplication;
  let db: DataSource;
  let users: { username: string; password: string; token: string }[] = [
    { username: 'test-1', password: 'password', token: '' },
    { username: 'test-2', password: 'password', token: '' }
  ];
  const categories = ['категория-1', 'категория-2', 'категория-3'];
  const subcategories = ['подкатегория-1', 'подкатегория-2', 'подкатегория-3'];
  const posts = [
    { title: 'new-post-1', body: 'new-post' },
    { title: 'new-post-2', body: 'new-post' },
    { title: 'new-post-3', body: 'new-post' }
  ];

  beforeAll(async () => {
    const { app: _app, module } = await createTestApp({ imports: [AppModule] });
    app = _app;
    db = await module.get(DataSource);
    await Promise.all(
      users.map((user) => createUser({ dataSource: db, ...user }))
    );
    const jwt = module.get(JwtService);
    users = users.map((user) => ({
      ...user,
      token: jwt.sign({ username: user.username })
    }));
  });
  afterAll(async () => {
    await db.query(
      `
        DELETE FROM posts_subcategories_subcategories WHERE "postsSlug" = ANY($1) OR "subcategoriesSlug" = ANY($2)
        `,
      [posts.map((p) => slugify(p.title)), subcategories.map((c) => slugify(c))]
    );

    await db.query(
      `
        DELETE FROM posts WHERE slug=ANY($1);
        `,
      [posts.map((p) => slugify(p.title))]
    );

    await db.query(
      `
        DELETE FROM subcategories WHERE slug = ANY($1);
        `,
      [subcategories.map((c) => slugify(c))]
    );

    await db.query(
      `
        DELETE FROM categories WHERE slug = $1
        `,
      [slugify(categories[0])]
    );
    await db.query(
      `
      DELETE FROM users WHERE username = ANY($1)
      `,
      [users.map((user) => user.username)]
    );
    app.close();
  });
  describe('create post', () => {
    afterEach(async () => {
      await db.query(
        `
        DELETE FROM posts_subcategories_subcategories WHERE "postsSlug" = ANY($1) OR "subcategoriesSlug" = ANY($2)
        `,
        [
          posts.map((p) => slugify(p.title)),
          subcategories.map((c) => slugify(c))
        ]
      );

      await db.query(
        `
        DELETE FROM posts WHERE slug=ANY($1);
        `,
        [posts.map((p) => slugify(p.title))]
      );

      await db.query(
        `
        DELETE FROM subcategories WHERE slug = ANY($1);
        `,
        [subcategories.map((c) => slugify(c))]
      );

      await db.query(
        `
        DELETE FROM categories WHERE slug = $1
        `,
        [slugify(categories[0])]
      );
    });
    it('post with unique title created', async () => {
      const res = await app
        .inject()
        .post('posts')
        .body(posts[0])
        .cookies({ token: users[0].token });
      expect(res.statusCode).toBe(201);
      const data = await res.json();
      expect(data.slug).toBe(slugify(posts[0].title));
      const record = await db.query<
        {
          slug: string;
          title: string;
          body: string;
          userUsername: string;
          createdAt: string;
        }[]
      >(
        `
        SELECT slug, title, body, "userUsername", "createdAt" FROM posts WHERE slug=$1
        `,
        [slugify(posts[0].title)]
      );
      expect(record.length).toBe(1);
      expect(record[0].slug).toBe(slugify(posts[0].title));
      expect(record[0].title).toBe(posts[0].title);
      expect(record[0].body).toBe(posts[0].body);
      expect(record[0].userUsername).toBe(users[0].username);
      expect(isNaN(new Date(record[0].createdAt).getTime())).toBeFalsy();
    });
    it('post with new category created', async () => {
      const res = await app
        .inject()
        .post('posts')
        .body({ ...posts[1], category: categories[0] })
        .cookies({ token: users[0].token });
      expect(res.statusCode).toBe(201);
      const record = await db.query<{ categorySlug: string }[]>(
        `
        SELECT * FROM posts WHERE slug = $1
        `,
        [slugify(posts[1].title)]
      );
      expect(record[0]?.categorySlug).toBe(slugify(categories[0]));
      const _category = await db.query<
        { slug: string; name: string; username: string }[]
      >(
        `
        SELECT slug, name, "userUsername" as username FROM categories WHERE slug = $1;
        `,
        [slugify(categories[0])]
      );
      expect(_category.length).toBe(1);
      expect(_category[0].slug).toBe(slugify(categories[0]));
      expect(_category[0].name).toBe(categories[0]);
      expect(_category[0].username).toBe(users[0].username);
    });
    it('posts with new subcategory created', async () => {
      const res = await app
        .inject()
        .post('posts')
        .body({
          ...posts[0],
          category: categories[0],
          subcategories: [subcategories[0]]
        })
        .cookies({ token: users[0].token });
      const record = await db.query<
        { postsSlug: string; subcategoriesSlug: string }[]
      >(
        `
        SELECT "postsSlug", "subcategoriesSlug" FROM posts_subcategories_subcategories
        WHERE "postsSlug" = $1
        `,
        [slugify(posts[0].title)]
      );
      expect(record.length).toBe(1);
      expect(
        record[0].subcategoriesSlug === slugify(subcategories[0])
      ).toBeTruthy();
      const _subcategory = await db.query<
        {
          slug: string;
          name: string;
          categorySlug: string;
          userUsername: string;
        }[]
      >(
        `
        SELECT slug, name, "categorySlug", "userUsername" FROM subcategories
        WHERE slug = $1
        `,
        [slugify(subcategories[0])]
      );
      expect(_subcategory.length).toBe(1);
      expect(_subcategory[0].name).toBe(subcategories[0]);
      expect(_subcategory[0].categorySlug).toBe(slugify(categories[0]));
      expect(_subcategory[0].userUsername).toBe(users[0].username);
    });
    it('post with same title cannot be created', async () => {
      await db.query(
        `
        INSERT INTO posts (slug, title, body, "userUsername") VALUES ($1, $2, $3, $4);
        `,
        [
          slugify(posts[0].title),
          posts[0].title,
          posts[0].body,
          users[0].username
        ]
      );
      const res = await app
        .inject()
        .post('posts')
        .body(posts[0])
        .cookies({ token: users[0].token });
      expect(res.statusCode).toBe(409);
      await db.query(
        `
        DELETE FROM posts WHERE slug = $1;
        `,
        [slugify(posts[0].title)]
      );
    });
    it('unauthorized user cannot create post', async () => {
      const res = await app.inject().post('posts').body(posts[0]).cookies({
        token:
          'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIiLCJpYXQiOjE3Mjc0NTg1OTMsImV4cCI6MTcyNzQ1OTc5NCwiYXVkIjoiIiwic3ViIjoiIiwidXNlcm5hbWUiOiJKb2hubnkifQ.J-jUu2ICbw8b61vDABN5f_hCiCm-x1RAWzJGwrC4BOQ'
      });
      expect(res.statusCode).toBe(401);
    });
  });
  describe('delete post', () => {
    beforeEach(async () => {
      await db.query(
        `
        INSERT INTO posts (slug, title, body, "userUsername")
        VALUES ($1, $2, $3, $4);
        `,
        [
          slugify(posts[0].title),
          posts[0].title,
          posts[0].body,
          users[0].username
        ]
      );
    });
    afterEach(async () => {
      await db.query(
        `
        DELETE FROM posts WHERE slug=$1;
        `,
        [slugify(posts[0].title)]
      );
    });
    it('post deleted', async () => {
      const res = await app
        .inject()
        .delete(`posts/${slugify(posts[0].title)}`)
        .cookies({ token: users[0].token });
      expect(res.statusCode).toBe(200);
      const record = await db.query<{ slug: string }[]>(
        `
        SELECT slug FROM posts WHERE slug = $1;
        `,
        [slugify(posts[0].title)]
      );
      expect(record.length).toBe(0);
    });
    describe('cascade delete', () => {
      beforeEach(async () => {
        await db.query(
          `
        INSERT INTO categories (slug, name, "userUsername") 
        VALUES ($1, $2, $3)
        `,
          [slugify(categories[0]), categories[0], users[0].username]
        );
        await db.query(
          `
        INSERT INTO subcategories (slug, name, "categorySlug", "userUsername")
        VALUES ($1, $2, $3, $4)
        `,
          [
            slugify(subcategories[0]),
            subcategories[0],
            slugify(categories[0]),
            users[0].username
          ]
        );
        await db.query(
          `
        INSERT INTO posts_subcategories_subcategories ("subcategoriesSlug", "postsSlug")
        VALUES ($1, $2);
        `,
          [slugify(subcategories[0]), slugify(posts[0].title)]
        );
      });
      afterEach(async () => {
        await db.query(
          `
          DELETE FROM posts_subcategories_subcategories 
          WHERE "postsSlug" = $1;
          `,
          [slugify(posts[0].title)]
        );
        await db.query(
          `
          DELETE FROM posts
          WHERE slug = $1;
          `,
          [slugify(posts[0].title)]
        );
        await db.query(
          `
          DELETE FROM subcategories
          WHERE slug = $1;
          `,
          [slugify(subcategories[0])]
        );
        await db.query(
          `
          DELETE FROM categories
          WHERE slug = $1;
          `,
          [slugify(categories[0])]
        );
      });

      it('post deleted', async () => {
        const res = await app
          .inject()
          .delete(`posts/${slugify(posts[0].title)}`)
          .cookies({ token: users[0].token });
        expect(res.statusCode).toBe(200);
        const record = await db.query<{ postsSlug: string }[]>(
          `
        SELECT "postsSlug" FROM posts_subcategories_subcategories 
        WHERE "postsSlug" = $1
        `,
          [slugify(posts[0].title)]
        );
        expect(record.length).toBe(0);
      });
    });

    it('a user cannot delete a post that does not belong to him', async () => {
      const res = await app
        .inject()
        .delete(`/posts/${slugify(posts[0].title)}`)
        .cookies({ token: users[1].token });
      expect(res.statusCode).toBe(403);
    });
  });
  describe('get posts', () => {
    beforeAll(async () => {
      await db.query(
        `
        INSERT INTO categories ("userUsername", slug, name)
        VALUES ${categories.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`).join(',')}
        `,
        [
          users[0].username,
          ...categories.reduce((acc, c) => {
            acc.push(slugify(c), c);
            return acc;
          }, [])
        ]
      );
      await db.query(
        `
        INSERT INTO subcategories ("userUsername", slug, name, "categorySlug")
        VALUES ($1, $2, $3, $4);
        `,
        [
          users[0].username,
          slugify(subcategories[0]),
          subcategories[0],
          slugify(categories[0])
        ]
      );
      await db.query(
        `
        INSERT INTO subcategories ("userUsername", "categorySlug", slug, name)
        VALUES ${subcategories
          .slice(1)
          .map((_, i) => `($1, $2, $${i * 2 + 3}, $${i * 2 + 4})`)
          .join(', ')}
        `,
        [
          users[1].username,
          slugify(categories[1]),
          ...subcategories.slice(1).reduce((acc, v) => {
            acc.push(slugify(v), v);
            return acc;
          }, [])
        ]
      );

      await db.query(
        `
        INSERT INTO posts (slug, title, body, "userUsername")
        VALUES ($1, $2, $3, $4);
        `,
        [
          slugify(posts[0].title),
          posts[0].title,
          posts[0].body,
          users[0].username
        ]
      );

      await Promise.all(
        posts.slice(1).map((p) => {
          return db.query(
            `
        INSERT INTO posts (slug, title, body, "userUsername", "categorySlug")
        VALUES ($1, $2, $3, $4, $5);
        `,
            [
              slugify(p.title),
              p.title,
              p.body,
              users[0].username,
              slugify(categories[1])
            ]
          );
        })
      );

      await db.query(
        `
        INSERT INTO posts_subcategories_subcategories ("postsSlug", "subcategoriesSlug")
        VALUES ($1, $2);
        `,
        [slugify(posts[1].title), slugify(subcategories[0])]
      );
      await db.query(
        `
        INSERT INTO posts_subcategories_subcategories ("postsSlug", "subcategoriesSlug")
        VALUES ($1, $2);
        `,
        [slugify(posts[2].title), slugify(subcategories[1])]
      );
    });
    afterAll(async () => {
      await db.query(
        `
        DELETE FROM posts_subcategories_subcategories 
        WHERE "postsSlug" = ANY($1)
        `,
        [posts.map((p) => slugify(p.title))]
      );
      await db.query(
        `
        DELETE FROM posts WHERE slug=ANY($1)
        `,
        [posts.map((p) => slugify(p.title))]
      );
      await db.query(
        `
        DELETE FROM subcategories WHERE slug=ANY($1)
        `,
        [subcategories.map((c) => slugify(c))]
      );
      await db.query(
        `
        DELETE FROM categories WHERE slug = ANY($1)
        `,
        [categories.map((c) => slugify(c))]
      );
    });
    it('when requesting without parameters, all posts are displayed', async () => {
      const res = await app.inject().get('posts');
      const data = await res.json() as IPost[];
      expect(posts.every((p) => data.findIndex((post) => post.title === p.title) !== -1)).toBeTruthy()
      expect(posts.slice(1).every(p => data.findIndex(post => post.title === p.title && post.category.name === categories[1]) !== -1)).toBeTruthy()
      expect(data.findIndex(post => post.slug === slugify(posts[1].title) && post.subcategories[0].slug === slugify(subcategories[0]) )!== -1).toBeTruthy()
    });
    it('when a category is entered, posts only with it are displayed', async () => {
      const res = await app.inject().get(`posts?category=${slugify(categories[1])}`)
      const data = await res.json() as IPost[];
      expect(data.every((post) => posts.slice(1).findIndex(p => post.title === p.title) !== -1)).toBeTruthy()
    })
    it("when a subcategory is entered, posts only with it are display", async () => {
      const res = await app.inject().get(`posts?subcategories=[${slugify(subcategories[1])}]`)
      const data = await res.json() as IPost[];
      expect(data.every((post) => posts[1].title ===  post.title)).toBeTruthy()
    })
    it("when a category and subcategory, posts only with them are displayed", async () => {
      const res = await app.inject().get(`posts?category=${slugify(categories[1])}&subcategories=${slugify(subcategories[0])}`)
      const data = await res.json() as IPost[];
      expect(data.every((post) => posts[1].title ===  post.title)).toBeTruthy()
    })
    it("when a category and subcategory, posts only with them are displayed", async () => {
      const res = await app.inject().get(`posts?category=${slugify(categories[1])}&subcategories=${slugify(subcategories[0])},${slugify(subcategories[1])}`)
      const data = await res.json() as IPost[];
      expect(data.every((post) => [posts[1].title, posts[2].title].includes(post.title))).toBeTruthy()
    })
  });
});
