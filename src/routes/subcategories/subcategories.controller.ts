import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  Res
} from '@nestjs/common';
import { CategoryDTO } from './types/CategoryDTO';
import { FastifyReply } from 'fastify';
import { Public } from 'src/guards/AuthGuard';
import { DeleteParams } from './types/DeleteParams';
import { SubcategoriesService } from './subcategories.service';
import { Request } from 'src/types/Request';

@Controller('/sub-categories')
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @Post()
  async createCategory(
    @Body() dto: CategoryDTO,
    @Req() req: Request,
    @Res() res: FastifyReply
  ) {
    const slug = await this.subcategoriesService.create(dto, req.username);
    res.status(HttpStatus.CREATED).send({ slug });
  }

  @Public()
  @Get()
  async getCategories(@Res() res: FastifyReply) {
    const categories = await this.subcategoriesService.get();
    res.send(categories);
  }

  @Delete(':slug')
  async deleteCategory(
    @Param() params: DeleteParams,
    @Req() req: Request,
    @Res() res: FastifyReply
  ) {
    await this.subcategoriesService.delete(params.slug, req.username);
    res.status(HttpStatus.OK).send();
  }
}
