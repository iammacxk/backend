import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StudentPerTermService } from './student-per-term.service';
import { CreateStudentPerTermDto } from './dto/create-student-per-term.dto';
import { UpdateStudentPerTermDto } from './dto/update-student-per-term.dto';

@ApiTags('student-per-term')
@Controller('student-per-term')
export class StudentPerTermController {
  constructor(private readonly studentPerTermService: StudentPerTermService) {}

  @Post()
  @ApiOperation({ summary: 'เพิ่มข้อมูลนักเรียนรายเทอม' })
  create(@Body() dto: CreateStudentPerTermDto) {
    return this.studentPerTermService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'ดูข้อมูลนักเรียนรายเทอมทั้งหมด' })
  findAll() {
    return this.studentPerTermService.findAll();
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'ดูข้อมูลรายเทอมทั้งหมดของนักเรียนคนเดียว' })
  findByStudent(@Param('studentId') studentId: string) {
    return this.studentPerTermService.findByStudent(+studentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ดูข้อมูลนักเรียนรายเทอมตาม id' })
  findOne(@Param('id') id: string) {
    return this.studentPerTermService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'แก้ไขข้อมูลนักเรียนรายเทอม' })
  update(@Param('id') id: string, @Body() dto: UpdateStudentPerTermDto) {
    return this.studentPerTermService.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'ลบข้อมูลนักเรียนรายเทอม' })
  remove(@Param('id') id: string) {
    return this.studentPerTermService.remove(+id);
  }
}
