import { IsNotEmpty, IsString, Length } from 'class-validator';

export class UserDTO {
  @IsString()
  @Length(3, 100)
  @IsNotEmpty()
  username: string;

  @IsString()
  @Length(4, 100)
  @IsNotEmpty()
  password: string;
}
