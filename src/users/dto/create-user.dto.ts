import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'ยูเซอร์เนมสำรหับเข้าสู่ระบบ',
    example: 'userInwza001',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'ชื่อของผู้ใช้',
    example: 'เอกชัย อิเอ๊กเอ๊ก',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'รหัสผ่าน (ต้องมีความยาว 8-32 ตัวอักษร)',
    example: 'StrongPass123!',
    minLength: 8,
    maxLength: 32,
  })
  @Length(8, 32)
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'ไอดีของบทบาท',
    example: '1',
  })
  @IsNumber()
  @Type(() => Number)
  roleId: number;

  @ApiProperty({
    description: 'ไอดีของโรงเรียน',
    example: '1',
  })
  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  schoolId?: number;
}
