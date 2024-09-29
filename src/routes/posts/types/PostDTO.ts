import { Transform } from 'class-transformer';
import {
  IsArray,
  isEmpty,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length
} from 'class-validator';

export class PostDTO {
  @IsString()
  @IsNotEmpty()
  @Length(1, 70)
  title: string;

  @IsOptional()
  @IsString()
  @Length(3, 70)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(3, 70, { each: true })
  subcategories?: string[];

  @IsString()
  @IsNotEmpty()
  @Length(1, 500)
  body: string;
}
