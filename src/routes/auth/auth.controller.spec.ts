import { createTestApp } from 'test/utils/createTestApp';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { createUser } from 'test/utils/createUser';
import 'dotenv/config';

describe('Auth controller', () => {
  let app: NestFastifyApplication;
  let db: DataSource;
  let jwt: JwtService;
  const users = [{ username: 'test-1', password: 'password' }];
  beforeAll(async () => {
    const { module, app: _app } = await createTestApp({});
    app = _app;
    db = module.get(DataSource);
    jwt = module.get(JwtService);
  });

  afterAll(async () => {
    await db.query(
      `
      DELETE FROM users WHERE username = $1
      `,
      [users[0].username]
    );
    app.close();
  });

  describe('sign', () => {
    afterEach(async () => {
      await db.query(
        `
        DELETE FROM users WHERE username=$1;
        `,
        [users[0].username]
      );
    });
    it('a user without a username cannot be created', async () => {
      const res = await app
        .inject()
        .post('/register')
        .body({ password: users[0].password });
      expect(res.statusCode).toBe(400);
    });
    it('a user without a username cannot be created', async () => {
      const res = await app
        .inject()
        .post('/register')
        .body({ password: users[0].password });
      expect(res.statusCode).toBe(400);
    });
    it('a user with short username cannot be created', async () => {
      const res = await app
        .inject()
        .post('/register')
        .body({ username: '12', password: users[0].password });
      expect(res.statusCode).toBe(400);
    });
    it('a user with long username cannot be created', async () => {
      const res = await app.inject().post('/register').body({
        username:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. In porta lectus nec mauris semper, eget in..',
        password: users[0].password
      });
      expect(res.statusCode).toBe(400);
    });
    it('a user without a password cannot be created', async () => {
      const res = await app
        .inject()
        .post('/register')
        .body({ usename: users[0].username });
      expect(res.statusCode).toBe(400);
    });
    it('a user with short password cannot be created', async () => {
      const res = await app.inject().post('/register').body({
        username: users[0].username,
        password: '1'
      });
      expect(res.statusCode).toBe(400);
    });
    it('a user with long password cannot be created', async () => {
      const res = await app.inject().post('/register').body({
        username: users[0].username,
        password:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. In porta lectus nec mauris semper, eget in..'
      });
      expect(res.statusCode).toBe(400);
    });
    it('unique user created', async () => {
      const res = await app.inject().post('/register').body(users[0]);
      expect(res.statusCode).toBe(201);
      const user = await db.query<{ username: string; password: string }[]>(
        `
        SELECT username, password FROM users WHERE username=$1;
        `,
        [users[0].username]
      );
      expect(!!user.length).toBeTruthy();
      expect(bcrypt.compare(user[0].password, users[0].password)).toBeTruthy();
    });
    it('a user with same name cannot be created', async () => {
      await createUser({ dataSource: db, ...users[0] });
      const res = await app.inject().post('/register').body(users[0]);
      expect(res.statusCode).toBe(409);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await createUser({ dataSource: db, ...users[0] });
    });
    afterEach(async () => {
      await db.query(
        `
        DELETE FROM users WHERE username = $1;
        `,
        [users[0].username]
      );
    });
    it('a user with an incorrect password is not authorized', async () => {
      const res = await app
        .inject()
        .post('sign')
        .body({ username: users[0].username, password: '123124' });
      expect(res.statusCode).toBe(401);
    });
    it('a user with an incorrect name is not found', async () => {
      const res = await app
        .inject()
        .post('sign')
        .body({ username: 'random-user', password: users[0].password });
      expect(res.statusCode).toBe(404);
    });
    it('user authorized', async () => {
      const res = await app.inject().post('sign').body(users[0]);
      expect(res.statusCode).toBe(200);
      jwt.verify(res.cookies.find((v) => v.name === 'token').value);
    });
  });
  describe('logout', () => {
    let token: string;
    beforeAll(async () => {
      await db.query(
        `
        INSERT INTO users (username, password) VALUES ($1, $2);
        `,
        [
          users[0].username,
          await bcrypt.hash(
            users[0].password,
            Number(process.env.PASS_CRYPTO_ROUNDS)
          )
        ]
      );
      token = jwt.sign({ username: users[0].username });
    });
    afterAll(async () => {
      await db.query(
        `
        DELETE FROM users WHERE username = $1;
        `,
        [users[0].username]
      );
    });
    it('token cleaned', async () => {
      const res = await app.inject().get('logout').cookies({ token });
      expect(res.statusCode).toBe(200);
      expect(res.cookies.find((v) => v.name === 'token').value).toBe('');
    });

    it('unauthorized user cannot be unauthorized', async () => {
      const res = await app.inject().get('logout');
      expect(res.statusCode).toBe(401);
    });
  });
});
