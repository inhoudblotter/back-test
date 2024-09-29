import { FastifyCookie } from '@fastify/cookie';
import { FastifyRequest } from 'fastify';

export interface Request extends Omit<FastifyRequest, 'cookies'> {
  cookies: FastifyCookie;
  username?: string;
}
