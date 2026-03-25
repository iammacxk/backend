import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RepeatGradeService } from './repeat-grade.service';

@ApiTags('RepeatGrade')
@Controller('repeat-grade')
export class RepeatGradeController {
  constructor(private readonly repeatGradeService: RepeatGradeService) {}

  @Get()
  @ApiOperation({ summary: 'ดึงข้อมูลนักเรียนซ้ำชั้นทั้งหมด' })
  findAllRepeatedStudents() {
    return this.repeatGradeService.findAllRepeatedStudents();
  }
}