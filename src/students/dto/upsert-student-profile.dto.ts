import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertStudentProfileDto {
  @ApiProperty({
    description: 'น้ำหนัก (กก.)',
    example: 55.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(400)
  weight?: number;

  @ApiProperty({
    description: 'ส่วนสูง (ซม.)',
    example: 165,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(400)
  height?: number;

  @ApiProperty({
    description: 'กรุ๊ปเลือด',
    example: 'O',
  })
  @IsOptional()
  @IsString()
  bloodType?: string;

  @ApiProperty({
    description: 'โรคประจำตัว',
    example: 'โรคหอบหืด',
  })
  @IsOptional()
  @IsString()
  congenitalDisease?: string;
}
