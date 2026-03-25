import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  AttendanceService,
  CreateAttendanceDto,
  UpdateAttendanceDto,
} from './attendance.service';

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ========== REASONS ==========

  @Get('reasons')
  @ApiOperation({ summary: 'ดึงรายการสาเหตุการขาดเรียนทั้งหมด' })
  findAllReasons() {
    return this.attendanceService.findAllReasons();
  }

  // ========== ATTENDANCE ==========

  @Post()
  @ApiOperation({ summary: 'บันทึกการเข้าเรียน' })
  create(@Body() dto: CreateAttendanceDto) {
    return this.attendanceService.create(dto);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'ดึงประวัติการเข้าเรียนของนักเรียน' })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'semester', required: false })
  findByStudent(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: string,
  ) {
    return this.attendanceService.findByStudent(
      studentId,
      academicYear,
      semester,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'ดึงข้อมูลการเข้าเรียนรายการเดียว' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'แก้ไขข้อมูลการเข้าเรียน' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'ลบข้อมูลการเข้าเรียน' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.attendanceService.remove(id);
  }

  // ========== SUMMARY ==========

  @Get('student/:studentId/summary')
  @ApiOperation({ summary: 'สรุปการขาดเรียน + เช็ค risk ของนักเรียน' })
  @ApiQuery({ name: 'academicYear', required: true })
  @ApiQuery({ name: 'semester', required: true })
  getAbsentSummary(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('academicYear') academicYear: string,
    @Query('semester') semester: string,
  ) {
    return this.attendanceService.getAbsentSummary(
      studentId,
      academicYear,
      semester,
    );
  }
}
