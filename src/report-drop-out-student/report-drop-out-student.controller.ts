import { Controller, Get, Query } from '@nestjs/common';
import { ReportDropOutStudentService } from './report-drop-out-student.service';
import { ApiQuery } from '@nestjs/swagger';

@Controller('report-dropout-student')
export class ReportDropOutStudentController {
  constructor(private readonly service: ReportDropOutStudentService) {}

  // summary (รองรับ optional filter)
  @Get('summary')
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'semester', required: false })
  @ApiQuery({ name: 'gradeLevelId', required: false })
  @ApiQuery({ name: 'schoolId', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'province', required: false })
  @ApiQuery({ name: 'district', required: false })
  @ApiQuery({ name: 'subdistrict', required: false })
  getSummary(
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: string,
    @Query('gradeLevelId') gradeLevelId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('province') province?: string,
    @Query('district') district?: string,
    @Query('subdistrict') subdistrict?: string,
  ) {
    return this.service.calculateDropout({
      academicYear,
      semester,
      gradeLevelId: gradeLevelId ? Number(gradeLevelId) : undefined,
      schoolId: schoolId ? Number(schoolId) : undefined,
      departmentId: departmentId ? Number(departmentId) : undefined,
      province,
      district,
      subdistrict,
    });
  }

  // trend สำหรับทำ กราฟ (ต้องมี year)
  @Get('trend')
  getTrend(@Query('year') year: string, @Query('semester') semester?: string) {
    return this.service.getDropoutTrend(year, semester ?? '1');
  }

  // comparison สำหรับตัวเลขเล็กๆในหน้า  dashboard ที่บอกเพิ่มขึ้นหรือลดลง จากปีที่แล้ว (ต้องมี year)
  @Get('comparison')
  getComparison(
    @Query('year') year: string,
    @Query('semester') semester?: string,
  ) {
    return this.service.getDropoutComparison(year, semester ?? '1');
  }

  // ข้อมูลแผนที่เด็กหลุด จัดกลุ่มตามจังหวัด+เขต
  @Get('map-district')
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'semester', required: false })
  @ApiQuery({ name: 'gradeLevelId', required: false })
  @ApiQuery({ name: 'schoolId', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'province', required: false })
  getDropoutMapDistrict(
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: string,
    @Query('gradeLevelId') gradeLevelId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('province') province?: string,
  ) {
    return this.service.getDropoutMapDistrict({
      academicYear,
      semester,
      gradeLevelId: gradeLevelId ? Number(gradeLevelId) : undefined,
      schoolId: schoolId ? Number(schoolId) : undefined,
      departmentId: departmentId ? Number(departmentId) : undefined,
      province,
    });
  }

  // ข้อมูลแผนที่เด็กหลุด จัดกลุ่มตามจังหวัด
  @Get('map')
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'semester', required: false })
  @ApiQuery({ name: 'gradeLevelId', required: false })
  @ApiQuery({ name: 'schoolId', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  getDropoutMap(
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: string,
    @Query('gradeLevelId') gradeLevelId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.service.getDropoutMap({
      academicYear,
      semester,
      gradeLevelId: gradeLevelId ? Number(gradeLevelId) : undefined,
      schoolId: schoolId ? Number(schoolId) : undefined,
      departmentId: departmentId ? Number(departmentId) : undefined,
    });
  }
}
