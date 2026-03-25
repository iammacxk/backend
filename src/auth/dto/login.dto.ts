import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'ชื่อผู้ใช้งาน',
    example: 'userInwza001',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'รหัสผ่าน',
    example: 'StrongPass123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
