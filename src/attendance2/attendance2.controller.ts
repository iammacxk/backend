import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { Attendance2Service } from './attendance2.service';
import { CreateAttendance2Dto } from './dto/create-attendance2.dto';
import { UpdateAttendance2Dto } from './dto/update-attendance2.dto';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateAttendanceReason2Dto } from 'src/attendance-reason2/dto/create-attendance-reason2.dto';
import { UpdateAttendanceReason2Dto } from 'src/attendance-reason2/dto/update-attendance-reason2.dto';
import { RiskQueryDto } from './dto/report-attendance2.dto';

@ApiTags('Attendance2')
@Controller('attendance2')
export class Attendance2Controller {
  constructor(private readonly attendance2Service: Attendance2Service) { }

  @Post()
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'ลบ Attendance2 ตาม id' })
  @ApiBody({ type: CreateAttendance2Dto })
  create(@Body() dto: CreateAttendance2Dto) {
    return this.attendance2Service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'เรียกดู Attendance2 ทั้งหมด' })
  findAll() {
    return this.attendance2Service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'เรียกดู Attendance2 ตาม id' })
  findOne(@Param('id') id: string) {
    return this.attendance2Service.findOne(+id);
  }

  @Patch(':id')
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'แก้ไข Attendance2 ตาม id' })
  @ApiBody({ type: UpdateAttendance2Dto })
  update(@Param('id') id: string, @Body() dto: UpdateAttendance2Dto) {
    return this.attendance2Service.update(+id, dto);
  }

  @Delete(':id')
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'ลบ Attendance2 ตาม id' })
  remove(@Param('id') id: string) {
    return this.attendance2Service.remove(+id);
  }

  //Bulk Create
  @Post('bulk')
  @ApiOperation({ summary: 'เพิ่ม Attendance2 แบบ bulk' })
  @ApiBody({ type: [CreateAttendance2Dto] })
  bulkCreate(@Body() dtos: CreateAttendance2Dto[]) {
    return this.attendance2Service.bulkCreate(dtos);
  }

  //การแสดงรายงานข้อมูล
  //แสดงจำนวนนักเรียนในแต่ละความเสี่ยง
  @Get('report/summary')
  @ApiOperation({ summary: 'สรุปจำนวนนักเรียนแต่ละระดับความเสี่ยง' })
  @ApiQuery({ name: 'academicYear', required: true, example: '2567' })
  @ApiQuery({ name: 'semester', required: false, example: '1' })
  @ApiQuery({ name: 'province', required: false, example: 'กรุงเทพมหานคร' })
  @ApiQuery({ name: 'district', required: false, example: 'เขตพระนคร' })
  @ApiQuery({ name: 'subdistrict', required: false, example: 'ชนะสงคราม' })
  @ApiQuery({ name: 'schoolId', required: false, example: '1' })
  getSummary(
    @Query('academicYear') academicYear: string,
    @Query('semester') semester?: string,
    @Query('province') province?: string,
    @Query('district') district?: string,
    @Query('subdistrict') subdistrict?: string,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.attendance2Service.getSummary(academicYear, semester, province, district, subdistrict, schoolId);
  }

  //นักเรียนโดยแบ่งตามแต่ละความเสี่ยง
  //weightedDays คือ ระดับความเสี่ยงจากการขาดเรียนทั้งจาก ลาและไม่ลา
  /*   ตัวย่างข้อมูล 
  {
  "high": [ 
    { "studentId": 2, "firstName": "...", "lastName": "...", "weightedDays": 45 }
  ],
    "medium": [...],
      "watch": [...],
        "normal": [...]
  } */
  @Get('report/students/grouped')
  @ApiOperation({ summary: 'รายชื่อนักเรียนแยกตามระดับความเสี่ยง (grouped)' })
  @ApiQuery({ name: 'academicYear', required: true, example: '2568' })
  @ApiQuery({ name: 'semester', required: false, example: '1', enum: ['1', '2'] })
  getStudentRiskGrouped(
    @Query('academicYear') academicYear: string,
    @Query('semester') semester?: string,
    @Query('province') province?: string,
    @Query('district') district?: string,
    @Query('subdistrict') subdistrict?: string,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.attendance2Service.getStudentRiskGrouped(academicYear, semester, province, district, subdistrict, schoolId);
  }

  //รายชื่อนักเรียนที่บอกว่าเสี่ยงระดับไหน
  /*  ตัวอย่างข้อมูล
  [
    { "studentId": 2, "firstName": "...", "lastName": "...", "weightedDays": 45, "riskLevel": "high" },
    { "studentId": 5, "firstName": "...", "lastName": "...", "weightedDays": 3, "riskLevel": "medium" }
  ] */
  @Get('report/students')
  @ApiOperation({ summary: 'รายชื่อนักเรียนพร้อมระดับความเสี่ยง' })
  @ApiQuery({ name: 'academicYear', required: true, example: '2568' })
  @ApiQuery({ name: 'semester', required: false, example: '1', enum: ['1', '2'] })
  @ApiQuery({ name: 'riskLevel', required: false, enum: ['high', 'medium', 'watch', 'normal'] })
  getStudentRiskList(
    @Query('academicYear') academicYear: string,
    @Query('semester') semester?: string,
    @Query('riskLevel') riskLevel?: 'high' | 'medium' | 'watch' | 'normal', //ความเสี่ยงให้ส่งมาตามนี้เผื่อใช้
    @Query('province') province?: string,
    @Query('district') district?: string,
    @Query('subdistrict') subdistrict?: string,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.attendance2Service.getStudentRiskList(academicYear, semester, riskLevel, province, district, subdistrict, schoolId);
  }


}
