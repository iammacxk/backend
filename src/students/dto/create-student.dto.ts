import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { validateThaiPersonId } from '../utils/validate-person-id';
function IsThaiPersonId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isThaiPersonId',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'string' && validateThaiPersonId(value);
        },
        defaultMessage() {
          return 'เลขบัตรประชาชนไม่ถูกต้อง (checksum ไม่ผ่าน)';
        },
      },
    });
  };
}
export class CreateStudentDto {
  @ApiProperty({
    description: 'เลขบัตรประชาชน',
    example: '1234567891234',
    minLength: 13,
  })
  @IsThaiPersonId()
  @IsString()
  @IsNotEmpty()
  personId: string;

  @ApiProperty({
    description: 'เลขพาสปอร์ต',
    example: '1234567891234',
    nullable: true,
  })
  @IsString()
  passportId: string;

  @ApiProperty({
    description: 'ชื่อของผู้ใช้',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'ชื่อกลางของผู้ใช้',
    example: '',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  middleName: string;

  @ApiProperty({
    description: 'นามสกุลของผู้ใช้',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: '2025-12-05',
    type: String,
    format: 'date',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate: string;

  @ApiProperty({
    description: 'บ้านเลขที่',
    example: '111',
  })
  @IsOptional()
  villageNumber: string;

  @ApiProperty({
    description: 'ชื่อถนน',
    example: 'bangsaen road',
  })
  @IsOptional()
  street: string;

  @ApiProperty({
    description: 'ซอย',
    example: 'ซอยกลางกลางซอย',
  })
  @IsOptional()
  soi: string;

  @ApiProperty({
    description: 'ตรอก',
    example: 'ตรอกสด',
  })
  @IsOptional()
  trok: string;

  @ApiProperty({
    description: 'id ของ prefix',
    example: '1',
  })
  @Type(() => Number)
  @IsNumber()
  prefix_id: number;

  @ApiProperty({
    description: 'id ของ gender',
    example: '1',
  })
  @Type(() => Number)
  @IsNumber()
  gender_id: number;

  @ApiProperty({
    description: 'id ของ nationality',
    example: '1',
  })
  @Type(() => Number)
  @IsNumber()
  nationality_id: number;

  @ApiProperty({
    description: 'id ของ disability',
    example: '1',
  })
  @Type(() => Number)
  @IsNumber()
  disability_id: number;

  @ApiProperty({
    description: 'id ของ disadvantage',
    example: '1',
  })
  @Type(() => Number)
  @IsNumber()
  disadvantage_id: number;

  @ApiProperty({
    description: 'id ของ town',
    example: '1',
  })
  @Type(() => Number)
  @IsNumber()
  town_id: number;
}
