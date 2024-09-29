import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Users } from 'src/db/entities/Users';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserDTO } from './types/UserDTO';
import { FastifyReply } from 'fastify';
import 'dotenv/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private jwtService: JwtService
  ) {}

  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, Number(process.env.PASS_CRYPTO_ROUNDS));
  }

  async check({ username, password }: UserDTO): Promise<void> {
    const res = await this.dataSource.query<{ password: string }[]>(
      `
      SELECT password FROM users WHERE username=$1 LIMIT 1;
      `,
      [username]
    );
    if (!res[0]?.password) throw new NotFoundException('user not found');
    if (!(await bcrypt.compare(password, res[0].password)))
      throw new UnauthorizedException('incorrect password');
  }

  async register({ username, password }: UserDTO) {
    try {
      const hash = await this.hashPassword(password);
      const res = await this.dataSource.query<{ username: string }[]>(
        `
      INSERT INTO users (username, password) VALUES ($1, $2) RETURNING username;
      `,
        [username, hash]
      );
      return res[0].username;
    } catch (error) {
      if (typeof error.code === 'string' && error.code === '23505') {
        throw new ConflictException('a user with the same name already exists');
      } else throw error;
    }
  }

  setToken(username: string, res: FastifyReply) {
    const token = this.jwtService.sign({ username });
    res.setCookie('token', token, {
      maxAge: Number(process.env.SESSION_LIFE_TIME),
      httpOnly: true
    });
  }
}
