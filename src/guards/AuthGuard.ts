import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { SetMetadata } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import 'dotenv/config';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const token = request.cookies['token'];

    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync<{
        username: string;
        exp: number;
      }>(token, {
        secret: process.env.JWT_SECRET
      });
      const expiersDate = new Date(payload.exp + 1000);
      const today = new Date();
      if (today.getDate() === expiersDate.getDate() - 1) {
        const res = http.getResponse<FastifyReply>();
        const token = this.jwtService.sign(payload.username);
        res.setCookie('token', token, {
          maxAge: Number(process.env.SESSION_LIFE_TIME),
          httpOnly: true
        });
      }
      request['username'] = payload.username;
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
