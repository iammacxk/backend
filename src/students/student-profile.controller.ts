import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StudentProfileService } from './student-profile.service';
import { UpsertStudentProfileDto } from './dto/upsert-student-profile.dto';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';

@ApiTags('Students')
@Controller('students')
export class StudentProfileController {
  constructor(private readonly studentProfileService: StudentProfileService) {}

  // ========== PROFILE ==========

  @Get(':studentId/profile')
  @ApiOperation({
    summary: 'ดึงข้อมูลสุขภาพนักเรียน (น้ำหนัก, ส่วนสูง, กรุ๊ปเลือด)',
  })
  getProfile(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.studentProfileService.getProfile(studentId);
  }

  @Patch(':studentId/profile')
  @ApiOperation({ summary: 'บันทึก/แก้ไขข้อมูลสุขภาพนักเรียน' })
  upsertProfile(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: UpsertStudentProfileDto,
  ) {
    return this.studentProfileService.upsertProfile(studentId, dto);
  }

  // ========== GUARDIAN ==========

  @Get(':studentId/guardians')
  @ApiOperation({ summary: 'ดึงรายชื่อผู้ปกครองของนักเรียน' })
  getGuardians(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.studentProfileService.getGuardians(studentId);
  }

  @Post(':studentId/guardians')
  @ApiOperation({ summary: 'เพิ่มผู้ปกครอง' })
  createGuardian(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: CreateGuardianDto,
  ) {
    return this.studentProfileService.createGuardian(studentId, dto);
  }

  @Patch('guardians/:id')
  @ApiOperation({ summary: 'แก้ไขข้อมูลผู้ปกครอง' })
  updateGuardian(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGuardianDto,
  ) {
    return this.studentProfileService.updateGuardian(id, dto);
  }

  @Delete('guardians/:id')
  @ApiOperation({ summary: 'ลบผู้ปกครอง' })
  removeGuardian(@Param('id', ParseIntPipe) id: number) {
    return this.studentProfileService.removeGuardian(id);
  }
}
