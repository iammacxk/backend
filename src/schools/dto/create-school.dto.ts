import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateSchoolDto {
  @ApiProperty({
    description: 'รหัสของโรงเรียน',
    example: '12345678900',
  })
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'ชื่อของโรงเรียน',
    example: 'โรงเรียนสาธิต',
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'id ของ school type',
    example: '1',
  })
  @Type(() => Number)
  @IsNumber()
  schoolType_id: number;

  @ApiProperty({
    description: 'id ของ department',
    example: '1',
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  department_id: number;

  @ApiProperty({
    description: 'id ของ town',
    example: '1',
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  town_id: number;
}
