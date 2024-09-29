import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString, Length } from 'class-validator';

export class PostQuery {
  @IsString()
  @Length(1, 70)
  @IsOptional()
  category: string | undefined;

  @IsOptional()
  @Transform(({value}) => value.split(','))
  @IsArray()
  @IsString({ each: true })
  @Length(1, 70, { each: true })
  subcategories: string[] | undefined;
}
