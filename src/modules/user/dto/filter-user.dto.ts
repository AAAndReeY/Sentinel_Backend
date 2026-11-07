import { IsOptional, IsString } from 'class-validator';
import { SearchDto } from '../../../common/dto';

export class FilterUserDto extends SearchDto {
  @IsOptional()
  @IsString()
  rol?: string;
}
