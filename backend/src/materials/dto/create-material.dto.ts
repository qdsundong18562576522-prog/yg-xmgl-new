import { IsString } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  name!: string;

  @IsString()
  brand!: string;

  @IsString()
  spec!: string;

  @IsString()
  unit!: string;
}
