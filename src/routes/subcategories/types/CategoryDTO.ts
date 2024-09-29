import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CategoryDTO {
  @IsString()
  @IsNotEmpty()
  @Length(1, 70)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 70)
  category: string;
}
