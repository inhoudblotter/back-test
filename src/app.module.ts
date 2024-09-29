import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import dataSource from './db/data-source';
import { AuthGuard } from './guards/AuthGuard';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './routes/auth/auth.module';
import { CategoriesModule } from './routes/categories/categories.module';
import { SubcategoriesModule } from './routes/subcategories/subcategories.module';
import { PostsModule } from './routes/posts/posts.module';
import 'dotenv/config';


@Module({
  imports: [
    TypeOrmModule.forRoot(dataSource),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: Number(process.env.SESSION_LIFE_TIME) }
    }),
    AuthModule,
    CategoriesModule,
    SubcategoriesModule,
    PostsModule
  ],
  controllers: [],
  providers: [
    {
      provide: 'APP_GUARD',
      useClass: AuthGuard
    }
  ]
})
export class AppModule {}
