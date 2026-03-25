import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, MinLength, IsNumber, IsInt } from 'class-validator';

export class UpdateUserDto {
    @ApiProperty({
        description: 'ยูเซอร์เนมสำรหับเข้าสู่ระบบ',
        example: 'userInwza001',
    })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({
        description: 'ชื่อของผู้ใช้',
        example: 'เอกชัย อิเอ๊กเอ๊ก',
      })
      @IsString()
      name: string;

    @ApiProperty({
        description: 'รหัสผ่าน (ต้องมีความยาว 8-32 ตัวอักษร)',
        example: 'StrongPass123!',
        minLength: 8,
        maxLength: 32,
    })
    @IsOptional()
    @MinLength(6)
    password?: string;

    @ApiProperty({
        description: 'ไอดีของบทบาท',
        example: '1',
    })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    roleId?: number;

    @ApiProperty({ example: 1, required: false })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    schoolId?: number;
}