import { IsOptional, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RiskQueryDto {
  @ApiProperty({ example: '2567', description: 'ปีการศึกษา (พ.ศ.)' })
  @Type(() => String)  // บังคับให้เป็น string ก่อน validate
  @Matches(/^25[0-9]{2}$/, { message: 'academicYear ต้องเป็นปี พ.ศ. 4 หลัก เช่น 2567' })
  academicYear: string;

  @ApiPropertyOptional({ example: '1', description: 'เทอม 1 หรือ 2' })
  @IsOptional()
  @Type(() => String)
  @Matches(/^[12]$/, { message: 'semester ต้องเป็น 1 หรือ 2 เท่านั้น' })
  semester?: string;
}