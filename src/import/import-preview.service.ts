import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { ImportResult } from './import.service';
import { DropoutImportResult } from './import-dropout.service';
import { validateThaiPersonId } from 'src/students/utils/validate-person-id';

export interface PreviewCell {
  value: any;
  hasError: boolean;
  errorMessage?: string;
}

export interface PreviewRow {
  rowNumber: number;
  hasError: boolean;
  cells: Record<string, PreviewCell>;
}

export interface PreviewResult {
  sessionId: string;
  totalRows: number;
  previewRows: PreviewRow[];
  errorCount: number;
  skipCount: number;
  expiresAt: string;
}

const REQUIRED_STUDENT_FIELDS: Record<string, string> = {
  PersonID_Onec: 'PersonID',
  FirstName_Onec: 'ชื่อ',
  LastName_Onec: 'นามสกุล',
  AcademicYear_Onec: 'ปีการศึกษา',
  Semester_Onec: 'ภาคเรียน',
};

const REQUIRED_DROPOUT_FIELDS: Record<string, string> = {
  ACADYEAR: 'ปีการศึกษา',
};

@Injectable()
export class ImportPreviewService {
  private readonly sessionStore = new Map<
    string,
    {
      buffer: Buffer;
      type: 'students' | 'dropout';
      fileName: string;
      expiresAt: Date;
    }
  >();

  private readonly resultStore = new Map<
    string,
    {
      result: ImportResult | DropoutImportResult;
      type: 'students' | 'dropout';
      expiresAt: Date;
    }
  >();

  constructor() {
    setInterval(() => this.cleanExpiredSessions(), 10 * 60 * 1000);
  }

  private cleanExpiredSessions() {
    const now = new Date();
    for (const [id, session] of this.sessionStore.entries()) {
      if (session.expiresAt < now) this.sessionStore.delete(id);
    }
    for (const [id, result] of this.resultStore.entries()) {
      if (result.expiresAt < now) this.resultStore.delete(id);
    }
  }

  getSession(sessionId: string) {
    const session = this.sessionStore.get(sessionId);
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      this.sessionStore.delete(sessionId);
      return null;
    }
    return session;
  }

  deleteSession(sessionId: string) {
    this.sessionStore.delete(sessionId);
  }

  saveResult(
    result: ImportResult | DropoutImportResult,
    type: 'students' | 'dropout',
  ): string {
    const reportId = randomUUID();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    this.resultStore.set(reportId, { result, type, expiresAt });
    return reportId;
  }

  getResult(reportId: string) {
    const entry = this.resultStore.get(reportId);
    if (!entry) return null;
    if (entry.expiresAt < new Date()) {
      this.resultStore.delete(reportId);
      return null;
    }
    return entry;
  }

  deleteResult(reportId: string) {
    this.resultStore.delete(reportId);
  }

  async previewStudents(
    buffer: Buffer,
    fileName: string,
  ): Promise<PreviewResult> {
    return this.generatePreview(
      buffer,
      'students',
      fileName,
      REQUIRED_STUDENT_FIELDS,
    );
  }

  async previewDropout(
    buffer: Buffer,
    fileName: string,
  ): Promise<PreviewResult> {
    return this.generatePreview(
      buffer,
      'dropout',
      fileName,
      REQUIRED_DROPOUT_FIELDS,
    );
  }

  private async generatePreview(
    buffer: Buffer,
    type: 'students' | 'dropout',
    fileName: string,
    requiredFields: Record<string, string>,
  ): Promise<PreviewResult> {
    const isCSV =
      fileName.toLowerCase().endsWith('.csv') ||
      fileName.toLowerCase().endsWith('.tsv');

    if (isCSV) {
      return this.generatePreviewCSV(buffer, type, fileName, requiredFields);
    }
    return this.generatePreviewXLSX(buffer, type, fileName, requiredFields);
  }

  // ---- XLSX streaming preview ----
  private async generatePreviewXLSX(
    buffer: Buffer,
    type: 'students' | 'dropout',
    fileName: string,
    requiredFields: Record<string, string>,
  ): Promise<PreviewResult> {
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(
      Readable.from(buffer),
      { sharedStrings: 'cache', hyperlinks: 'ignore', worksheets: 'emit' },
    );

    let headers: string[] = [];
    const previewRows: PreviewRow[] = [];
    let totalRows = 0;
    let errorCount = 0;
    let skipCount = 0;
    const seenKeys = new Set<string>();

    for await (const worksheetReader of workbookReader as any) {
      for await (const row of worksheetReader) {
        const rowNumber: number = (row as any).number;

        if (rowNumber === 1) {
          headers = ((row as any).values as any[])
            .slice(1)
            .map((v: any) => String(v ?? '').trim());
          continue;
        }

        totalRows++;

        const values = (row as any).values as any[];
        const rowObj: Record<string, any> = {};
        headers.forEach((h, i) => {
          rowObj[h] = values[i + 1] ?? null;
        });

        const { previewRow, hasError, dupKey } = this.validateRow(
          rowObj,
          rowNumber,
          requiredFields,
          type,
        );

        // เช็ค duplicate ภายในไฟล์เดียวกัน
        if (dupKey && seenKeys.has(dupKey)) {
          skipCount++;
          continue;
        }
        if (dupKey) seenKeys.add(dupKey);

        if (hasError) errorCount++;
        if (previewRows.length < 100) previewRows.push(previewRow);
      }
      break; // sheet แรกอย่างเดียว
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    this.sessionStore.set(sessionId, { buffer, type, fileName, expiresAt });

    return {
      sessionId,
      totalRows,
      previewRows,
      errorCount,
      skipCount,
      expiresAt: expiresAt.toISOString(),
    };
  }

  // ---- CSV streaming preview ----
  private async generatePreviewCSV(
    buffer: Buffer,
    type: 'students' | 'dropout',
    fileName: string,
    requiredFields: Record<string, string>,
  ): Promise<PreviewResult> {
    const csvParser = await import('csv-parser');

    const previewRows: PreviewRow[] = [];
    let totalRows = 0;
    let errorCount = 0;
    let skipCount = 0;
    const seenKeys = new Set<string>();

    await new Promise<void>((resolve, reject) => {
      Readable.from(buffer)
        .pipe(csvParser.default())
        .on('data', (row: Record<string, any>) => {
          totalRows++;
          const rowNumber = totalRows + 1;

          const { previewRow, hasError, dupKey } = this.validateRow(
            row,
            rowNumber,
            requiredFields,
            type,
          );

          // เช็ค duplicate ภายในไฟล์เดียวกัน
          if (dupKey && seenKeys.has(dupKey)) {
            skipCount++;
            return;
          }
          if (dupKey) seenKeys.add(dupKey);

          if (hasError) errorCount++;
          if (previewRows.length < 100) previewRows.push(previewRow);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    this.sessionStore.set(sessionId, { buffer, type, fileName, expiresAt });

    return {
      sessionId,
      totalRows,
      previewRows,
      errorCount,
      skipCount,
      expiresAt: expiresAt.toISOString(),
    };
  }

  // ---- validate แต่ละ row ----
  private validateRow(
    row: Record<string, any>,
    rowNumber: number,
    requiredFields: Record<string, string>,
    type: 'students' | 'dropout',
  ): { previewRow: PreviewRow; hasError: boolean; dupKey: string | null } {
    const cells: Record<string, PreviewCell> = {};
    let rowHasError = false;

    for (const [key, value] of Object.entries(row)) {
      const cell: PreviewCell = { value, hasError: false };

      if (key in requiredFields) {
        const isEmpty =
          value === null ||
          value === undefined ||
          value === '' ||
          value === 'NULL';
        if (isEmpty) {
          cell.hasError = true;
          cell.errorMessage = `${requiredFields[key]} ห้ามเป็นค่าว่าง`;
          rowHasError = true;
        }
      }

      if (key === 'PersonID_Onec' && value && type === 'students') {
        const str = String(value).trim();
        if (!validateThaiPersonId(str)) {
          cell.hasError = true;
          cell.errorMessage = 'เลขบัตรประชาชนไม่ถูกต้อง (checksum ไม่ผ่าน)';
          rowHasError = true;
        }
      }

      cells[key] = cell;
    }

    // สร้าง dupKey สำหรับเช็ค duplicate ภายในไฟล์
    let dupKey: string | null = null;
    if (type === 'students') {
      const personId = row['PersonID_Onec']
        ? String(row['PersonID_Onec']).trim()
        : null;
      const academicYear = row['AcademicYear_Onec']
        ? String(row['AcademicYear_Onec']).trim()
        : null;
      const semester = row['Semester_Onec']
        ? String(row['Semester_Onec']).trim()
        : null;
      const schoolId = row['SchoolID_Onec']
        ? String(row['SchoolID_Onec']).trim()
        : null;
      if (personId && academicYear && semester) {
        dupKey = `${personId}_${academicYear}_${semester}_${schoolId ?? ''}`;
      }
    } else {
      // dropout
      const personId = row['PersonID_Onec']
        ? String(row['PersonID_Onec']).trim()
        : null;
      const academicYear = row['ACADYEAR']
        ? String(row['ACADYEAR']).trim()
        : null;
      if (academicYear) {
        dupKey = personId ? `${personId}_${academicYear}` : null;
      }
    }

    return {
      previewRow: { rowNumber, hasError: rowHasError, cells },
      hasError: rowHasError,
      dupKey,
    };
  }
}
