import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostDTO } from './types/PostDTO';
import { FastifyReply } from 'fastify';
import { Request } from 'src/types/Request';
import { DeleteParams } from '../categories/types/DeleteParams';
import { PostQuery } from './types/PostQuery';
import { Public } from 'src/guards/AuthGuard';

@Controller('/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async createPost(
    @Body() dto: PostDTO,
    @Req() req: Request,
    @Res() res: FastifyReply
  ) {
    const slug = await this.postsService.create(dto, req.username);
    res.status(HttpStatus.CREATED).send({ slug });
  }

  @Delete('/:slug')
  async deletePost(
    @Param() params: DeleteParams,
    @Req() req: Request,
    @Res() res: FastifyReply
  ) {
    await this.postsService.delete(params.slug, req.username);
    res.status(HttpStatus.OK).send();
  }

  @Public()
  @Get()
  @UsePipes(new ValidationPipe({transform: true}))
  async getPosts(@Res() res: FastifyReply, @Query() query: PostQuery) {
    const posts = await this.postsService.get(query);
    res.send(posts);
  }
}
