import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateRoleDto {
    @ApiProperty({
    example: 'adminInwza001',
    description: 'ชื่อ role',
  })
    @IsString()
    @IsNotEmpty()
    name: string;
}