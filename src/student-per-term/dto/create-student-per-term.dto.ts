import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateStudentPerTermDto {
  @ApiProperty({ description: 'id ของนักเรียน', example: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  student_id: number;

  @ApiProperty({ description: 'id ของโรงเรียน', example: 1, required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  school_id?: number;

  @ApiProperty({ description: 'ปีการศึกษา', example: '2567' })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty({ description: 'ภาคเรียน', example: '1' })
  @IsString()
  @IsNotEmpty()
  semester: string;

  @ApiProperty({
    description: 'ปีที่เข้าโรงเรียน',
    example: '2566',
    required: false,
  })
  @IsString()
  @IsOptional()
  schoolAdmissionYear?: string;

  @ApiProperty({ description: 'เกรดเฉลี่ย', example: '3.50', required: false })
  @IsString()
  @IsOptional()
  gpax?: string;

  @ApiProperty({ description: 'id ของระดับชั้น', example: 1, required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  gradeLevel_id?: number;

  @ApiProperty({
    description: 'id ของสถานะนักเรียน',
    example: 1,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  studentStatus_id?: number;

  @ApiProperty({ description: 'id ของสังกัด', example: 1, required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  department_id?: number;
}
