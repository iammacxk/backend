import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AttendanceReason2Service } from './attendance-reason2.service';
import { CreateAttendanceReason2Dto } from './dto/create-attendance-reason2.dto';
import { UpdateAttendanceReason2Dto } from './dto/update-attendance-reason2.dto';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateAttendance2Dto } from 'src/attendance2/dto/create-attendance2.dto';
import { UpdateAttendance2Dto } from 'src/attendance2/dto/update-attendance2.dto';

@ApiTags('AttendanceReason2')
@Controller('attendance-reason2')
export class AttendanceReason2Controller {
  constructor(private readonly attendanceReason2Service: AttendanceReason2Service) { }

  @Post()
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'สร้าง AttendanceReason2' })
  @ApiBody({ type: CreateAttendanceReason2Dto })
  create(@Body() dto: CreateAttendanceReason2Dto) {
    return this.attendanceReason2Service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'สร้าง AttendanceReason2' })
  findAll() {
    return this.attendanceReason2Service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'เรียกดู AttendanceReason2 ตาม id' })
  findOne(@Param('id') id: string) {
    return this.attendanceReason2Service.findOne(+id);
  }

  @Patch(':id')
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'แก้ไข AttendanceReason2 ตาม id' })
  @ApiBody({ type: UpdateAttendanceReason2Dto })
  update(@Param('id') id: string, @Body() dto: UpdateAttendanceReason2Dto) {
    return this.attendanceReason2Service.update(+id, dto);
  }

  @Delete(':id')
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'ลบ AttendanceReason2 ตาม id' })
  remove(@Param('id') id: string) {
    return this.attendanceReason2Service.remove(+id);
  }
}
