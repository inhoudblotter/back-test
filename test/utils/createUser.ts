import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

export async function createUser({
  dataSource,
  username,
  password = 'password'
}: {
  dataSource: DataSource;
  username: string;
  password?: string;
}) {
  return dataSource.query(
    `
      INSERT INTO users (username, password) VALUES ($1, $2)
      `,
    [
      username,
      await bcrypt.hash(password, Number(process.env.PASS_CRYPTO_ROUNDS))
    ]
  );
}
