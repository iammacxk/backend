import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  GuardianType,
  MaritalStatus,
  ParentStatus,
} from '../entities/student-guardian.entity';

export class CreateGuardianDto {
  @ApiProperty({
    description: 'ประเภทผู้ปกครอง',
    enum: GuardianType,
    example: GuardianType.FATHER,
  })
  @IsEnum(GuardianType)
  guardianType: GuardianType;

  @ApiProperty({
    description: 'ชื่อจริงผู้ปกครอง',
    example: 'สมชาย',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'นามสกุลผู้ปกครอง',
    example: 'ใจดี',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'เบอร์โทรศัพท์ผู้ปกครอง',
    example: '0812345678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: '',
    enum: ParentStatus,
    example: ParentStatus.ALIVE,
  })
  @IsOptional()
  @IsEnum(ParentStatus)
  parentStatus?: ParentStatus;

  @ApiProperty({
    description: '',
    enum: MaritalStatus,
    example: MaritalStatus.MARRIED,
  })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @ApiProperty({
    description: 'id ของ CLS_OCCUPATIONGROUP',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  occupation_id?: number;

  @ApiProperty({
    description: 'id ของ CLS_EDUCATION_LEVEL',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  education_level_id?: number;
}
