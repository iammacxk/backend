import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateRoleDto {
    @ApiProperty({
        example: 'admin',
        description: 'ชื่อ role',
      })
    @IsOptional()
    @IsString()
    name?: string;
}