import { Controller, Get, Query } from '@nestjs/common';
import { ReportRepeatGradeService } from './report-repeat-grade.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Report Repeat Grade')
@Controller('report-repeat-grade')
export class ReportRepeatGradeController {
  constructor(private readonly service: ReportRepeatGradeService) {}

  // summary สำหรับ dashboard
  @Get('summary')
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'semester', required: false })
  getSummary(
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: string,
  ) {
    return this.service.calculateRepeatGrade({
      academicYear,
      semester,
    });
  }

  // trend (กราฟ)
  @Get('trend')
  @ApiQuery({ name: 'year', required: true })
  getTrend(@Query('year') year: string) {
    return this.service.getTrend(year);
  }

  // comparison (ตัวเลขเพิ่ม/ลด)
  @Get('comparison')
  @ApiQuery({ name: 'year', required: true })
  getComparison(@Query('year') year: string) {
    return this.service.getComparison(year);
  }

  // top โรงเรียนซ้ำชั้น
  @Get('top-schools')
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'semester', required: false })
  getTopSchools(
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: string,
  ) {
    return this.service.getTopSchools({
      academicYear,
      semester,
    });
  }
}