import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  Param,
  ParseIntPipe,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ImportService } from './import.service';
import { ImportDropoutService } from './import-dropout.service';
import { ImportPreviewService } from './import-preview.service';
import { ImportHistoryService } from './import-history.service';
import { ErrorReportService } from './error-report.service';
import { AuthGuard } from '../auth/auth.guard';

const ALLOWED_MIMETYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

@ApiTags('import')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('import')
export class ImportController {
  constructor(
    private readonly importStudentsService: ImportService,
    private readonly importDropoutService: ImportDropoutService,
    private readonly importPreviewService: ImportPreviewService,
    private readonly importHistoryService: ImportHistoryService,
    private readonly errorReportService: ErrorReportService,
  ) {}

  // ========== PREVIEW ==========

  @Post('students/preview')
  @ApiOperation({ summary: 'Preview 100 แถวแรก + validate ทั้งไฟล์' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async previewStudents(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('กรุณาแนบไฟล์ .xlsx หรือ .csv');
    if (!ALLOWED_MIMETYPES.includes(file.mimetype))
      throw new BadRequestException('รองรับเฉพาะ .xlsx และ .csv');
    return this.importPreviewService.previewStudents(
      file.buffer,
      file.originalname,
    );
  }

  @Post('dropout/preview')
  @ApiOperation({ summary: 'Preview dropout 100 แถวแรก + validate ทั้งไฟล์' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async previewDropout(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('กรุณาแนบไฟล์ .xlsx หรือ .csv');
    if (!ALLOWED_MIMETYPES.includes(file.mimetype))
      throw new BadRequestException('รองรับเฉพาะ .xlsx และ .csv');
    return this.importPreviewService.previewDropout(
      file.buffer,
      file.originalname,
    );
  }

  // ========== CONFIRM ==========

  @Post('students/confirm/:sessionId')
  @ApiOperation({
    summary: 'ยืนยัน import นักเรียน → บันทึก history + return reportId',
  })
  async confirmStudents(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
  ) {
    const session = this.importPreviewService.getSession(sessionId);
    if (!session)
      throw new BadRequestException(
        'Session หมดอายุหรือไม่มีอยู่ กรุณา preview ใหม่',
      );
    if (session.type !== 'students')
      throw new BadRequestException('Session นี้ไม่ใช่ไฟล์นักเรียน');

    // importFromBuffer คืน result พร้อม errorRawRows แล้ว
    const result = await this.importStudentsService.importFromBuffer(
      session.buffer,
      session.fileName,
    );
    this.importPreviewService.deleteSession(sessionId);

    const user = req['user'];
    await this.importHistoryService.record({
      userId: user?.sub ?? null,
      userName: user?.name ?? null,
      fileName: session.fileName,
      importType: 'students',
      totalRows: result.totalRows,
      successCount: result.successCount,
      skippedCount: result.skippedCount,
      errorCount: result.errorCount,
      errors: result.errors, // ← เก็บลง DB
      errorRawRows: result.errorRawRows, // ← เก็บลง DB
    });

    const reportId = this.importPreviewService.saveResult(result, 'students');
    return {
      totalRows: result.totalRows,
      successCount: result.successCount,
      skippedCount: result.skippedCount,
      errorCount: result.errorCount,
      reportId,
      reportExpiresIn: '2 ชั่วโมง',
    };
  }

  @Post('dropout/confirm/:sessionId')
  @ApiOperation({
    summary: 'ยืนยัน import เด็กหลุด → บันทึก history + return reportId',
  })
  async confirmDropout(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
  ) {
    const session = this.importPreviewService.getSession(sessionId);
    if (!session)
      throw new BadRequestException(
        'Session หมดอายุหรือไม่มีอยู่ กรุณา preview ใหม่',
      );
    if (session.type !== 'dropout')
      throw new BadRequestException('Session นี้ไม่ใช่ไฟล์เด็กหลุด');

    const result = await this.importDropoutService.importFromBuffer(
      session.buffer,
      session.fileName,
    );
    this.importPreviewService.deleteSession(sessionId);

    const user = req['user'];
    await this.importHistoryService.record({
      userId: user?.sub ?? null,
      userName: user?.name ?? null,
      fileName: session.fileName,
      importType: 'dropout',
      totalRows: result.totalRows,
      successCount: result.successCount,
      skippedCount: result.skippedCount,
      errorCount: result.errorCount,
      errors: result.errors,
      errorRawRows: result.errorRawRows,
    });

    const reportId = this.importPreviewService.saveResult(result, 'dropout');
    return {
      totalRows: result.totalRows,
      successCount: result.successCount,
      skippedCount: result.skippedCount,
      errorCount: result.errorCount,
      reportId,
      reportExpiresIn: '2 ชั่วโมง',
    };
  }

  // ========== DIRECT IMPORT ==========

  @Post('students')
  @ApiOperation({ summary: 'Import นักเรียนโดยตรง (ไม่มี preview)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importStudents(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('กรุณาแนบไฟล์ .xlsx หรือ .csv');
    if (!ALLOWED_MIMETYPES.includes(file.mimetype))
      throw new BadRequestException('รองรับเฉพาะ .xlsx และ .csv');

    const result = await this.importStudentsService.importFromBuffer(
      file.buffer,
      file.originalname,
    );
    const user = req['user'];
    await this.importHistoryService.record({
      userId: user?.sub ?? null,
      userName: user?.name ?? null,
      fileName: file.originalname,
      importType: 'students',
      totalRows: result.totalRows,
      successCount: result.successCount,
      skippedCount: result.skippedCount,
      errorCount: result.errorCount,
      errors: result.errors,
      errorRawRows: result.errorRawRows,
    });

    const reportId = this.importPreviewService.saveResult(result, 'students');
    return {
      totalRows: result.totalRows,
      successCount: result.successCount,
      skippedCount: result.skippedCount,
      errorCount: result.errorCount,
      reportId,
      reportExpiresIn: '2 ชั่วโมง',
    };
  }

  @Post('dropout')
  @ApiOperation({ summary: 'Import เด็กหลุดโดยตรง (ไม่มี preview)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importDropout(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('กรุณาแนบไฟล์ .xlsx หรือ .csv');
    if (!ALLOWED_MIMETYPES.includes(file.mimetype))
      throw new BadRequestException('รองรับเฉพาะ .xlsx และ .csv');

    const result = await this.importDropoutService.importFromBuffer(
      file.buffer,
      file.originalname,
    );
    const user = req['user'];
    await this.importHistoryService.record({
      userId: user?.sub ?? null,
      userName: user?.name ?? null,
      fileName: file.originalname,
      importType: 'dropout',
      totalRows: result.totalRows,
      successCount: result.successCount,
      skippedCount: result.skippedCount,
      errorCount: result.errorCount,
      errors: result.errors,
      errorRawRows: result.errorRawRows,
    });

    const reportId = this.importPreviewService.saveResult(result, 'dropout');
    return {
      totalRows: result.totalRows,
      successCount: result.successCount,
      skippedCount: result.skippedCount,
      errorCount: result.errorCount,
      reportId,
      reportExpiresIn: '2 ชั่วโมง',
    };
  }

  // ========== HISTORY ==========

  @Get('history')
  @ApiOperation({ summary: 'ดู history การ import ทั้งหมด' })
  getHistory() {
    return this.importHistoryService.findAll();
  }

  // ---- Download error list (จาก history ถาวร) ----
  @Get('history/:id/errors/download')
  @ApiOperation({ summary: 'Download error list จาก history เป็น xlsx' })
  async downloadHistoryErrors(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: false }) res: Response,
  ) {
    const buffer = await this.importHistoryService.downloadErrorList(id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="error_list_${id}.xlsx"`,
    );
    res.end(buffer);
  }

  // ---- Download raw file เฉพาะ error rows ----
  @Get('history/:id/errors/raw')
  @ApiOperation({
    summary: 'Download raw file เฉพาะ error rows (column เดิมทุก column)',
  })
  async downloadHistoryErrorRaw(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: false }) res: Response,
  ) {
    const { buffer, fileName } =
      await this.importHistoryService.downloadErrorRawFile(id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.end(buffer);
  }

  // ========== DOWNLOAD (reportId-based, หมดอายุ 2 ชม.) ==========

  @Get('report/:reportId/errors')
  @ApiOperation({
    summary: 'Download error report จาก reportId (หมดอายุ 2 ชม.)',
  })
  async downloadErrors(
    @Param('reportId') reportId: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const entry = this.importPreviewService.getResult(reportId);
    if (!entry) throw new NotFoundException('Report หมดอายุหรือไม่มีอยู่');
    const errors = entry.result.errors;
    if (!errors?.length)
      throw new BadRequestException('ไม่มี error ให้ download');
    const buffer = this.errorReportService.generateErrorReport(errors);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="import_errors.xlsx"',
    );
    res.end(buffer);
  }

  @Get('report/:reportId/skipped')
  @ApiOperation({
    summary: 'Download skipped report จาก reportId (หมดอายุ 2 ชม.)',
  })
  async downloadSkipped(
    @Param('reportId') reportId: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const entry = this.importPreviewService.getResult(reportId);
    if (!entry) throw new NotFoundException('Report หมดอายุหรือไม่มีอยู่');
    const skipped = entry.result.skipped;
    if (!skipped?.length) throw new BadRequestException('ไม่มีแถวที่ถูกข้าม');
    const buffer = this.errorReportService.generateErrorReport(skipped);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="import_skipped.xlsx"',
    );
    res.end(buffer);
  }
}
