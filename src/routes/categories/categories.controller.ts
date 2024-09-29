import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  Res
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoryDTO } from './types/CategoryDTO';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from 'src/guards/AuthGuard';
import { DeleteParams } from './types/DeleteParams';
import { Request } from 'src/types/Request';

@Controller('/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async createCategory(
    @Body() dto: CategoryDTO,
    @Req() req: Request,
    @Res() res: FastifyReply
  ) {
    const slug = await this.categoriesService.create(dto, req.username);
    res.status(HttpStatus.CREATED).send({ slug });
  }

  @Public()
  @Get()
  async getCategories(@Res() res: FastifyReply) {
    const categories = await this.categoriesService.get();
    res.send(categories);
  }

  @Delete(':slug')
  async deleteCategory(
    @Param() params: DeleteParams,
    @Req() req: Request,
    @Res() res: FastifyReply
  ) {
    await this.categoriesService.delete(params.slug, req.username);
    res.status(HttpStatus.OK).send();
  }
}
