import { IsNotEmpty, IsString, Length } from 'class-validator';

class DeleteParams {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  slug: string;
}
