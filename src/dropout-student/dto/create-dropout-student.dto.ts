import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateDropoutStudentDto {
  @ApiProperty({
    description: 'id ของนักเรียน (ถ้า PersonID ตรงกัน)',
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  student_id?: number;

  @ApiProperty({ description: 'id ของ town', required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  town_id?: number;

  @ApiProperty({ description: 'id ของระดับชั้น', required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  gradeLevel_id?: number;

  @ApiProperty({
    example: '2009-05-15',
    type: String,
    format: 'date',
    required: false,
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsOptional()
  birthDate?: string;

  @ApiProperty({ description: 'บ้านเลขที่', required: false })
  @IsString()
  @IsOptional()
  houseNumber?: string;

  @ApiProperty({ description: 'หมู่บ้าน', required: false })
  @IsString()
  @IsOptional()
  villageNumber?: string;

  @ApiProperty({ description: 'ถนน', required: false })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty({ description: 'ซอย', required: false })
  @IsString()
  @IsOptional()
  soi?: string;

  @ApiProperty({ description: 'ตรอก', required: false })
  @IsString()
  @IsOptional()
  trok?: string;

  @ApiProperty({ description: 'ชื่อโรงเรียน', required: false })
  @IsString()
  @IsOptional()
  schoolName?: string;

  @ApiProperty({ description: 'ปีการศึกษาปัจจุบัน', required: false })
  @IsString()
  @IsOptional()
  academicYearPresent?: string;

  @ApiProperty({ description: 'ปีการศึกษา (ACADYEAR)', example: '2567' })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty({ description: 'รหัสสาเหตุที่หลุด', required: false })
  @IsString()
  @IsOptional()
  statusCodeCause?: string;

  @ApiProperty({ description: 'รหัสประเภทการออก/ย้าย', required: false })
  @IsString()
  @IsOptional()
  dropoutTransferId?: string;

  @ApiProperty({ description: 'หมายเหตุ', required: false })
  @IsString()
  @IsOptional()
  remark?: string;
}
