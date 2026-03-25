import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportService } from './report.service';

@ApiTags('report')
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) { }

  // ========== FILTER OPTIONS ==========

  @Get('filter-options')
  @ApiOperation({
    summary: 'ดึง options สำหรับ dropdown filter (จังหวัด, ปีการศึกษา)',
  })
  async getFilterOptions() {
    return this.reportService.getFilterOptions();
  }

  // ========== DROPOUT ==========

  @Get('dropout/summary')
  @ApiOperation({
    summary:
      'สรุปสถิตินักเรียนหลุดออกจากระบบ (แยกตามจังหวัด, สาเหตุ, ระดับชั้น)',
  })
  @ApiQuery({ name: 'academicYear', required: false, example: '2565' })
  @ApiQuery({ name: 'province', required: false, example: 'เชียงใหม่' })
  async getDropoutSummary(
    @Query('academicYear') academicYear?: string,
    @Query('province') province?: string,
  ) {
    return this.reportService.getDropoutSummary({ academicYear, province });
  }

  @Get('dropout/list')
  @ApiOperation({ summary: 'รายชื่อนักเรียนหลุดออกจากระบบ' })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'province', required: false })
  async getDropoutList(
    @Query('academicYear') academicYear?: string,
    @Query('province') province?: string,
  ) {
    return this.reportService.getDropoutList({ academicYear, province });
  }

  @Get('dropout/export')
  @ApiOperation({ summary: 'Export รายชื่อนักเรียนหลุดออกจากระบบ เป็น xlsx' })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'province', required: false })
  async exportDropout(
    @Res({ passthrough: false }) res: Response,
    @Query('academicYear') academicYear?: string,
    @Query('province') province?: string,
  ) {
    const buffer = await this.reportService.exportDropout({
      academicYear,
      province,
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="dropout_report.xlsx"',
    );
    res.end(buffer);
  }

  // ========== DISABLED ==========

  @Get('disabled/summary')
  @ApiOperation({
    summary: 'สรุปสถิตินักเรียนพิการ (แยกตามประเภทความพิการ, จังหวัด)',
  })
  @ApiQuery({ name: 'province', required: false })
  async getDisabledSummary(@Query('province') province?: string) {
    return this.reportService.getDisabledSummary({ province });
  }

  @Get('disabled/list')
  @ApiOperation({ summary: 'รายชื่อนักเรียนพิการ' })
  @ApiQuery({ name: 'province', required: false })
  async getDisabledList(@Query('province') province?: string) {
    return this.reportService.getDisabledList({ province });
  }

  @Get('disabled/export')
  @ApiOperation({ summary: 'Export รายชื่อนักเรียนพิการ เป็น xlsx' })
  @ApiQuery({ name: 'province', required: false })
  async exportDisabled(
    @Res({ passthrough: false }) res: Response,
    @Query('province') province?: string,
  ) {
    const buffer = await this.reportService.exportDisabled({ province });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="disabled_report.xlsx"',
    );
    res.end(buffer);
  }
}
