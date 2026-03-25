import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ description: 'รหัสผู้ใช้งาน', example: 1 })
  id: number;

  @ApiProperty({ description: 'ชื่อผู้ใช้งาน', example: 'userInwza001' })
  username: string;

  @ApiProperty({ description: 'ชื่อผู้ใช้งาน', example: 'userInwza001' })
  name: string;

  @ApiProperty({ description: 'รหัสบทบาท (Role ID)', example: 1 })
  roleId: number;

  @ApiProperty({ description: 'ชื่อบทบาท', example: 'ผู้ดูแลระบบ' })
  roleName: string;

  @ApiProperty({ description: 'รหัสโรงเรียน (ถ้ามี)', example: 1, nullable: true })
  schoolId: number | null;

  @ApiProperty({ description: 'ชื่อโรงเรียน (ถ้ามี)', example: 'โรงเรียนตัวอย่าง', nullable: true })
  schoolName: string | null;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT Access Token สำหรับใช้ยืนยันตัวตน' })
  access_token: string;

  @ApiProperty({ description: 'ข้อมูลผู้ใช้งานที่เข้าสู่ระบบ', type: UserProfileDto })
  user: UserProfileDto;
}
