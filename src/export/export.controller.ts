import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExportService } from './export.service';
import { AuthGuard } from '../auth/auth.guard';

const VALID_TYPES = [
  'attendance-risk',
  'dropout',
  'repeat-grade',
  'disability',
] as const;
type ExportType = (typeof VALID_TYPES)[number];

const FILE_NAMES: Record<ExportType, string> = {
  'attendance-risk': 'รายงานนักเรียนเสี่ยงหลุด',
  dropout: 'รายงานนักเรียนหลุดออกจากระบบ',
  'repeat-grade': 'รายงานนักเรียนซ้ำชั้น',
  disability: 'รายงานนักเรียนพิการ',
};

@ApiTags('Export')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  // ================================================================
  // GET /export/xlsx
  // ================================================================
  @Get('xlsx')
  @ApiOperation({ summary: 'Export รายงานเป็น Excel (.xlsx)' })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: VALID_TYPES,
    description: 'ประเภทรายงาน',
  })
  @ApiQuery({ name: 'academicYear', required: false, example: '2567' })
  @ApiQuery({
    name: 'semester',
    required: false,
    example: '1',
    enum: ['1', '2'],
  })
  async exportXlsx(
    @Query('type') type: string,
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: string,
    @Res({ passthrough: false }) res?: Response,
  ) {
    if (!VALID_TYPES.includes(type as ExportType)) {
      throw new BadRequestException(`type ต้องเป็น: ${VALID_TYPES.join(', ')}`);
    }

    if (type === 'attendance-risk' && !academicYear) {
      throw new BadRequestException('academicYear จำเป็นสำหรับรายงานนี้');
    }

    const buffer = await this.exportService.generateXlsx(type, {
      academicYear,
      semester,
    });
    const fileName = encodeURIComponent(
      `${FILE_NAMES[type as ExportType]}${academicYear ? `_${academicYear}` : ''}.xlsx`,
    );

    res!.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res!.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${fileName}`,
    );
    res!.end(buffer);
  }

  // ================================================================
  // GET /export/pdf
  // ================================================================
  @Get('pdf')
  @ApiOperation({ summary: 'Export รายงานเป็น PDF' })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: VALID_TYPES,
    description: 'ประเภทรายงาน',
  })
  @ApiQuery({ name: 'academicYear', required: false, example: '2567' })
  @ApiQuery({
    name: 'semester',
    required: false,
    example: '1',
    enum: ['1', '2'],
  })
  async exportPdf(
    @Query('type') type: string,
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: string,
    @Res({ passthrough: false }) res?: Response,
  ) {
    if (!VALID_TYPES.includes(type as ExportType)) {
      throw new BadRequestException(`type ต้องเป็น: ${VALID_TYPES.join(', ')}`);
    }

    if (type === 'attendance-risk' && !academicYear) {
      throw new BadRequestException('academicYear จำเป็นสำหรับรายงานนี้');
    }

    const buffer = await this.exportService.generatePdf(type, {
      academicYear,
      semester,
    });
    const fileName = encodeURIComponent(
      `${FILE_NAMES[type as ExportType]}${academicYear ? `_${academicYear}` : ''}.pdf`,
    );

    res!.setHeader('Content-Type', 'application/pdf');
    res!.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${fileName}`,
    );
    res!.end(buffer);
  }

  // ================================================================
  // GET /export/preview  — ดูข้อมูล JSON ก่อน export (สำหรับ debug)
  // ================================================================
  @Get('preview')
  @ApiOperation({ summary: 'Preview ข้อมูลก่อน export (JSON)' })
  @ApiQuery({ name: 'type', required: true, enum: VALID_TYPES })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'semester', required: false })
  async preview(
    @Query('type') type: string,
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: string,
  ) {
    if (!VALID_TYPES.includes(type as ExportType)) {
      throw new BadRequestException(`type ต้องเป็น: ${VALID_TYPES.join(', ')}`);
    }

    switch (type) {
      case 'attendance-risk':
        return this.exportService.getAttendanceRiskData(
          academicYear!,
          semester,
        );
      case 'dropout':
        return this.exportService.getDropoutData(academicYear, semester);
      case 'repeat-grade':
        return this.exportService.getRepeatGradeData();
      case 'disability':
        return this.exportService.getDisabilityData(academicYear, semester);
    }
  }

  @Get('dropout-summary')
  async dropoutSummary(@Query('academicYear') y?, @Query('semester') s?) {
    return this.exportService.getDropoutSummaryByStatus(y, s);
  }
}
