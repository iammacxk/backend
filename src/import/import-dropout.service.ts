import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { Student } from '../students/entities/student.entity';
import { GradeLevel } from '../lookups/gradeLevel.entity';
import { Town } from '../lookups/town.entity';
import { DropoutStudent } from 'src/dropout-student/entities/dropout-student.entity';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export interface DropoutRowError {
  row: number;
  personId?: string | null;
  reasons: string[];
}

export interface DropoutImportResult {
  totalRows: number;
  successCount: number;
  skippedCount: number;
  errorCount: number;
  skipped: { row: number; reason: string }[];
  errors: DropoutRowError[];
  errorRawRows: Record<string, any>[];
}

const toStr = (val: any): string | null => {
  if (val === null || val === undefined || val === '' || val === 'NULL')
    return null;
  return String(val).trim() || null;
};

const buildLookupMap = <T>(
  entities: T[],
  getCode: (e: T) => string,
): Map<string, T> => {
  const map = new Map<string, T>();
  for (const e of entities) {
    const code = getCode(e).trim();
    map.set(code, e);
    const numeric = String(Number(code));
    if (numeric !== 'NaN' && numeric !== code) map.set(numeric, e);
  }
  return map;
};

const parseExcelDate = (val: any): Date | null => {
  if (val === null || val === undefined || val === '' || val === 'NULL')
    return null;
  if (typeof val === 'number') {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const str = String(val).trim();
  if (!str) return null;
  const formats = ['D/M/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
  for (const fmt of formats) {
    const parsed = dayjs(str, fmt, true);
    if (parsed.isValid()) return parsed.toDate();
  }
  return null;
};

const BATCH_SIZE = 2000;

@Injectable()
export class ImportDropoutService {
  constructor(
    @InjectRepository(DropoutStudent)
    private readonly dropoutRepo: Repository<DropoutStudent>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(GradeLevel)
    private readonly gradeLevelRepo: Repository<GradeLevel>,
    @InjectRepository(Town)
    private readonly townRepo: Repository<Town>,
  ) {}

  async importFromBuffer(
    buffer: Buffer,
    fileName?: string,
  ): Promise<DropoutImportResult> {
    const startTime = Date.now(); // ← เพิ่ม
    console.log(`[Import] เริ่ม import: ${fileName ?? 'unknown'}`);

    const isCSV =
      fileName?.toLowerCase().endsWith('.csv') ||
      fileName?.toLowerCase().endsWith('.tsv');

    // โหลด lookup ครั้งเดียว
    const [gradeLevels, towns, existingStudents, existingDropouts] =
      await Promise.all([
        this.gradeLevelRepo.find(),
        this.townRepo.find(),
        this.studentRepo.find({
          select: ['id', 'personId'],
          withDeleted: true,
        }),
        this.dropoutRepo.find({
          select: ['id', 'academicYear', 'birthDate', 'personId'],
          relations: ['student'],
          withDeleted: true,
        }),
      ]);

    const gradeLevelMap = buildLookupMap(gradeLevels, (e) => e.code);
    const townByFullName = new Map(
      towns.map((e) => [
        `${e.CLS_PROVINCE?.trim()}_${e.CLS_DISTRICT?.trim()}_${e.CLS_SUBDISTRICT?.trim()}`,
        e,
      ]),
    );
    const studentByPersonId = new Map(
      existingStudents.map((s) => [s.personId, s]),
    );
    const existingDropoutMap = new Map(
      existingDropouts.map((d) => [
        d.personId
          ? `${d.personId}_${d.academicYear}`
          : d.student?.personId
            ? `${d.student.personId}_${d.academicYear}`
            : `${d.birthDate}_${d.academicYear}`,
        d,
      ]),
    );
    const existingKeys = new Set(existingDropoutMap.keys());

    const result: DropoutImportResult = {
      totalRows: 0,
      successCount: 0,
      skippedCount: 0,
      errorCount: 0,
      skipped: [],
      errors: [],
      errorRawRows: [],
    };

    const ctx = {
      gradeLevelMap,
      townByFullName,
      studentByPersonId,
      existingDropoutMap,
      existingKeys,
      result,
    };

    if (isCSV) {
      await this.streamCSV(buffer, ctx);
    } else {
      await this.streamXLSX(buffer, ctx);
    }
    // ← เพิ่ม log ตรงนี้
    const elapsed = Date.now() - startTime;
    const seconds = (elapsed / 1000).toFixed(2);
    const minutes = (elapsed / 60000).toFixed(2);
    console.log(`[Import] เสร็จสิ้น: ${fileName ?? 'unknown'}`);
    console.log(`[Import] ใช้เวลา: ${seconds} วินาที (${minutes} นาที)`);
    console.log(
      `[Import] สำเร็จ: ${ctx.result.successCount} | ข้าม: ${ctx.result.skippedCount} | error: ${ctx.result.errorCount} / ${ctx.result.totalRows} rows`,
    );
    return result;
  }

  // ---- XLSX streaming ----
  private async streamXLSX(buffer: Buffer, ctx: any): Promise<void> {
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(
      Readable.from(buffer),
      { sharedStrings: 'cache', hyperlinks: 'ignore', worksheets: 'emit' },
    );

    let headers: string[] = [];
    let pendingRows: { row: Record<string, any>; rowNumber: number }[] = [];

    for await (const worksheetReader of workbookReader as any) {
      for await (const row of worksheetReader) {
        const rowNumber: number = (row as any).number;

        if (rowNumber === 1) {
          headers = ((row as any).values as any[])
            .slice(1)
            .map((v: any) => String(v ?? '').trim());
          continue;
        }

        ctx.result.totalRows++;
        const values = (row as any).values as any[];
        const rowObj: Record<string, any> = {};
        headers.forEach((h, i) => {
          rowObj[h] = values[i + 1] ?? null;
        });

        pendingRows.push({ row: rowObj, rowNumber });

        if (pendingRows.length >= BATCH_SIZE) {
          await this.processChunk(pendingRows.splice(0, BATCH_SIZE), ctx);
        }
      }
      break;
    }

    if (pendingRows.length > 0) {
      await this.processChunk(pendingRows, ctx);
    }
  }

  // ---- CSV streaming ----
  private async streamCSV(buffer: Buffer, ctx: any): Promise<void> {
    const csvParser = await import('csv-parser');
    let pendingRows: { row: Record<string, any>; rowNumber: number }[] = [];
    let rowNumber = 1;

    await new Promise<void>((resolve, reject) => {
      Readable.from(buffer)
        .pipe(csvParser.default())
        .on('data', async (row: Record<string, any>) => {
          rowNumber++;
          ctx.result.totalRows++;
          pendingRows.push({ row, rowNumber });

          if (pendingRows.length >= BATCH_SIZE) {
            const batch = pendingRows.splice(0, BATCH_SIZE);
            await this.processChunk(batch, ctx);
          }
        })
        .on('end', async () => {
          if (pendingRows.length > 0) {
            await this.processChunk(pendingRows, ctx);
          }
          resolve();
        })
        .on('error', reject);
    });
  }

  // ---- process chunk ----
  private async processChunk(
    items: { row: Record<string, any>; rowNumber: number }[],
    ctx: any,
  ): Promise<void> {
    for (const { row, rowNumber } of items) {
      const errors: string[] = [];

      const personId = toStr(row['PersonID_Onec']);
      const birthDate = parseExcelDate(row['BirthDate_Onec']);
      const birthDateStr = birthDate
        ? dayjs(birthDate).format('YYYY-MM-DD')
        : null;
      const provinceNameThai = toStr(row['ProvinceNameThai_Onec']);
      const districtNameThai = toStr(row['DistrictNameThai_Onec']);
      const subDistrictName = toStr(row['SubDistrictNameThai_Onec']);
      const gradeLevelCode = toStr(row['GradeLevelID_Onec']);
      const academicYear = toStr(row['ACADYEAR']);
      const academicYearPresent = toStr(row['AcademicYearPresent_Onec']);
      const schoolName = toStr(row['SchoolName_Onec']);
      const statusCodeCause = toStr(row['StatusCodeCause_Onec']);
      const dropoutTransferId = toStr(row['DropoutTransferID_Onec']);
      const remark = toStr(row['Remark_Onec']);
      const houseNumber = toStr(row['HouseNumber_Onec']);
      const villageNumber = toStr(row['VillageNumber_Onec']);
      const street = toStr(row['Street_Onec']);
      const soi = toStr(row['Soi_Onec']);
      const trok = toStr(row['Trok_Onec']);

      if (!academicYear) errors.push('ACADYEAR ห้ามเป็นค่าว่าง');

      if (errors.length > 0) {
        ctx.result.errorCount++;
        ctx.result.errors.push({ row: rowNumber, reasons: errors });
        ctx.result.errorRawRows.push(row);
        continue;
      }

      const gradeLevel = gradeLevelCode
        ? ctx.gradeLevelMap.get(gradeLevelCode)
        : undefined;
      const townKey =
        provinceNameThai && districtNameThai && subDistrictName
          ? `${provinceNameThai}_${districtNameThai}_${subDistrictName}`
          : null;
      const town = townKey ? ctx.townByFullName.get(townKey) : undefined;
      const student = personId
        ? (ctx.studentByPersonId.get(personId) ?? null)
        : null;
      const dupKey = personId
        ? `${personId}_${academicYear}`
        : `${birthDateStr}_${academicYear}`;

      if (ctx.existingKeys.has(dupKey)) {
        const existingDropout = ctx.existingDropoutMap.get(dupKey);
        if (existingDropout && !existingDropout.student && student) {
          await this.dropoutRepo.update(existingDropout.id, {
            student: { id: student.id },
          });
        }
        ctx.result.skippedCount++;
        ctx.result.skipped.push({
          row: rowNumber,
          reason: `ข้อมูลซ้ำ (${personId ? `PersonID ${personId}` : `BirthDate ${birthDateStr}`} + ปีการศึกษา ${academicYear})`,
        });
        continue;
      }

      try {
        const dropout = this.dropoutRepo.create({
          student: student ?? undefined,
          personId: personId ?? null,
          town: town ?? undefined,
          birthDate: birthDate ?? null,
          houseNumber,
          villageNumber,
          street,
          soi,
          trok,
          gradeLevel: gradeLevel ?? undefined,
          schoolName,
          academicYearPresent,
          academicYear: academicYear!,
          statusCodeCause,
          dropoutTransferId,
          remark,
        });

        await this.dropoutRepo.save(dropout);
        ctx.existingKeys.add(dupKey);
        ctx.existingDropoutMap.set(dupKey, dropout);
        ctx.result.successCount++;
      } catch (err) {
        ctx.result.errorCount++;
        ctx.result.errors.push({
          row: rowNumber,
          reasons: [`บันทึกไม่สำเร็จ: ${(err as Error).message}`],
        });
      }
    }
  }
}
