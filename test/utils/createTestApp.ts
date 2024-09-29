import { ModuleMetadata, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  FastifyAdapter,
  NestFastifyApplication
} from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import dataSource from 'src/db/data-source';
import { AuthGuard } from 'src/guards/AuthGuard';
import { AuthModule } from 'src/routes/auth/auth.module';
import 'dotenv/config';

export async function createTestApp({
  imports,
  controllers,
  providers,
  exports
}: ModuleMetadata) {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot(dataSource),
      JwtModule.register({
        global: true,
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: Number(process.env.SESSION_LIFE_TIME) }
      }),
      AuthModule,
      ...(imports || [])
    ],
    controllers,
    providers: [
      ...(providers || []),
      {
        provide: 'APP_GUARD',
        useClass: AuthGuard
      }
    ],
    exports
  }).compile();
  const app = module.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter()
  );
  app.useGlobalPipes(new ValidationPipe());
  await app.register(require('@fastify/cookie'), {
    secret: process.env.COOKIE_SECRET
  });
  await app.init();
  return { module, app };
}
