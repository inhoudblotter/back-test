import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Res
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserDTO } from './types/UserDTO';
import { Public } from 'src/guards/AuthGuard';
import { JwtService } from '@nestjs/jwt';
import { FastifyReply } from 'fastify';
import { QueryFailedError } from 'typeorm';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('sign')
  async signIn(@Body() dto: UserDTO, @Res() res: FastifyReply): Promise<void> {
    await this.authService.check(dto);
    this.authService.setToken(dto.username, res);
    res.status(HttpStatus.OK).send();
  }

  @Get('logout')
  logOut(@Res() res: FastifyReply): void {
    res.clearCookie('token');
    res.status(HttpStatus.OK).send();
  }

  @Public()
  @Post('register')
  async register(
    @Body() dto: UserDTO,
    @Res() res: FastifyReply
  ): Promise<void> {
    const username = await this.authService.register(dto);
    this.authService.setToken(username, res);
    res.status(HttpStatus.CREATED).send();
  }
}
