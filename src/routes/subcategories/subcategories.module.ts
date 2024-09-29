import { Module } from '@nestjs/common';
import { SubcategoriesController } from './subcategories.controller';
import { SubcategoriesService } from './subcategories.service';

@Module({
  providers: [SubcategoriesService],
  controllers: [SubcategoriesController]
})
export class SubcategoriesModule {}
