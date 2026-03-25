import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { Student } from '../students/entities/student.entity';
import { StudentPerTerm } from '../student-per-term/entities/student-per-term.entity';
import { School } from '../schools/entities/school.entity';
import { Prefix } from '../lookups/prefix.entity';
import { Gender } from '../lookups/gender.entity';
import { Nationality } from '../lookups/nationality.entity';
import { Disability } from '../lookups/disability.entity';
import { Disadvantage } from '../lookups/disadvantage.entity';
import { Department } from '../lookups/department.entity';
import { StudentStatus } from '../lookups/studentStatus.entity';
import { GradeLevel } from '../lookups/gradeLevel.entity';
import { Town } from '../lookups/town.entity';
import { validateThaiPersonId } from 'src/students/utils/validate-person-id';

export interface RowError {
  row: number;
  personId: string | null;
  reasons: string[];
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  skippedCount: number;
  errorCount: number;
  skipped: { row: number; personId: string; reason: string }[];
  errors: RowError[];
  errorRawRows: Record<string, any>[];
}

// ---- helpers ----
const toStr = (val: any): string | null => {
  if (val === null || val === undefined || val === '') return null;
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

const chunk = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// PostgreSQL รับได้เยอะกว่า SQLite มาก
const BATCH_SIZE = 2000;

interface ValidatedStudentRow {
  rowNumber: number;
  rawRow: Record<string, any>;
  finalPersonId: string;
  passportId: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  villageNumber: string | null;
  street: string | null;
  soi: string | null;
  trok: string | null;
  academicYear: string;
  semester: string;
  schoolAdmissionYear: string | null;
  gpax: string | null;
  prefix: any;
  gender: any;
  nationality: any;
  disability: any;
  disadvantage: any;
  department: any;
  studentStatus: any;
  gradeLevel: any;
  town: any;
  school: any;
}

// Context ที่ส่งระหว่าง chunk
interface ImportContext {
  prefixMap: Map<string, any>;
  genderMap: Map<string, any>;
  nationalityMap: Map<string, any>;
  disabilityMap: Map<string, any>;
  disadvantageMap: Map<string, any>;
  departmentMap: Map<string, any>;
  studentStatusMap: Map<string, any>;
  gradeLevelMap: Map<string, any>;
  townMap: Map<string, any>;
  schoolMap: Map<string, any>;
  studentByPersonId: Map<string, Student>;
  existingPerTermKeys: Set<string>;
  result: ImportResult;
  rowIndex: number;
}

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(StudentPerTerm)
    private readonly studentPerTermRepo: Repository<StudentPerTerm>,
    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,
    @InjectRepository(Prefix)
    private readonly prefixRepo: Repository<Prefix>,
    @InjectRepository(Gender)
    private readonly genderRepo: Repository<Gender>,
    @InjectRepository(Nationality)
    private readonly nationalityRepo: Repository<Nationality>,
    @InjectRepository(Disability)
    private readonly disabilityRepo: Repository<Disability>,
    @InjectRepository(Disadvantage)
    private readonly disadvantageRepo: Repository<Disadvantage>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(StudentStatus)
    private readonly studentStatusRepo: Repository<StudentStatus>,
    @InjectRepository(GradeLevel)
    private readonly gradeLevelRepo: Repository<GradeLevel>,
    @InjectRepository(Town)
    private readonly townRepo: Repository<Town>,
    private readonly dataSource: DataSource,
  ) {}

  // ---- entry point: รับ buffer + ชื่อไฟล์ ----
  async importFromBuffer(
    buffer: Buffer,
    fileName?: string,
  ): Promise<ImportResult> {
    //จับเวลา เริ่ม
    const startTime = Date.now(); // ← เพิ่ม
    console.log(`[Import] เริ่ม import: ${fileName ?? 'unknown'}`);

    const isCSV =
      fileName?.toLowerCase().endsWith('.csv') ||
      fileName?.toLowerCase().endsWith('.tsv');

    // โหลด lookup ครั้งเดียว
    const ctx = await this.buildContext();

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

    return ctx.result;
  }

  // ---- build context: โหลด lookup + existing data ----
  private async buildContext(): Promise<ImportContext> {
    const [
      prefixes,
      genders,
      nationalities,
      disabilities,
      disadvantages,
      departments,
      studentStatuses,
      gradeLevels,
      towns,
      schools,
    ] = await Promise.all([
      this.prefixRepo.find(),
      this.genderRepo.find(),
      this.nationalityRepo.find(),
      this.disabilityRepo.find(),
      this.disadvantageRepo.find(),
      this.departmentRepo.find(),
      this.studentStatusRepo.find(),
      this.gradeLevelRepo.find(),
      this.townRepo.find(),
      this.schoolRepo.find({ take: 10000 }),
    ]);

    // โหลด existing students — ใช้ Map เช็ค dupe O(1)
    // สำหรับ 10M rows ใช้ query เฉพาะ personId ที่ต้องการใน batch แทน
    const existingStudents = await this.studentRepo.find({
      select: ['id', 'personId'],
      withDeleted: true,
    });

    const existingPerTerms = await this.studentPerTermRepo.find({
      select: ['id', 'academicYear', 'semester'],
      relations: ['student', 'school'],
      withDeleted: true,
    });

    return {
      prefixMap: buildLookupMap(prefixes, (e) => e.code),
      genderMap: buildLookupMap(genders, (e) => e.code),
      nationalityMap: buildLookupMap(nationalities, (e) => e.code),
      disabilityMap: buildLookupMap(disabilities, (e) => e.code),
      disadvantageMap: buildLookupMap(disadvantages, (e) => e.code),
      departmentMap: buildLookupMap(departments, (e) => e.code),
      studentStatusMap: buildLookupMap(studentStatuses, (e) => e.code),
      gradeLevelMap: buildLookupMap(gradeLevels, (e) => e.code),
      townMap: new Map(towns.map((e) => [e.code_subdistrict?.trim(), e])),
      schoolMap: buildLookupMap(schools, (e) => e.code),
      studentByPersonId: new Map(existingStudents.map((s) => [s.personId, s])),
      existingPerTermKeys: new Set(
        existingPerTerms.map(
          (pt) =>
            `${pt.student?.id}_${pt.academicYear}_${pt.semester}_${pt.school?.id}`,
        ),
      ),
      result: {
        totalRows: 0,
        successCount: 0,
        skippedCount: 0,
        errorCount: 0,
        skipped: [],
        errors: [],
        errorRawRows: [],
      },
      rowIndex: 0,
    };
  }

  // ---- XLSX streaming ----
  private async streamXLSX(buffer: Buffer, ctx: ImportContext): Promise<void> {
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(
      Readable.from(buffer),
      { sharedStrings: 'cache', hyperlinks: 'ignore', worksheets: 'emit' },
    );

    let headers: string[] = [];
    let pendingRows: Record<string, any>[] = [];

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
        ctx.rowIndex = rowNumber;

        const values = (row as any).values as any[];
        const rowObj: Record<string, any> = {};
        headers.forEach((h, i) => {
          rowObj[h] = values[i + 1] ?? null;
        });

        pendingRows.push(rowObj);

        // process ทีละ chunk
        if (pendingRows.length >= BATCH_SIZE) {
          await this.processChunk(pendingRows.splice(0, BATCH_SIZE), ctx);
        }
      }
      break; // sheet แรก
    }

    // rows ที่เหลือ
    if (pendingRows.length > 0) {
      await this.processChunk(pendingRows, ctx);
    }
  }

  // ---- CSV streaming ----
  private async streamCSV(buffer: Buffer, ctx: ImportContext): Promise<void> {
    const csvParser = await import('csv-parser');
    let pendingRows: Record<string, any>[] = [];
    let rowNumber = 1;

    await new Promise<void>((resolve, reject) => {
      Readable.from(buffer)
        .pipe(csvParser.default())
        .on('data', async (row: Record<string, any>) => {
          rowNumber++;
          ctx.result.totalRows++;
          ctx.rowIndex = rowNumber;
          pendingRows.push(row);

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

  // ---- process chunk: validate + insert ----
  private async processChunk(
    rows: Record<string, any>[],
    ctx: ImportContext,
  ): Promise<void> {
    const validRows: ValidatedStudentRow[] = [];

    // validate
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = ctx.rowIndex - rows.length + i + 2;
      const errors: string[] = [];

      const personId = toStr(row['PersonID_Onec']);
      const passportId = toStr(row['PassportNumber_Onec']);
      const firstName = toStr(row['FirstName_Onec']);
      const middleName = toStr(row['MiddleName_Onec']);
      const lastName = toStr(row['LastName_Onec']);
      const academicYear = toStr(row['AcademicYear_Onec']);
      const semester = toStr(row['Semester_Onec']);
      const schoolCode = toStr(row['SchoolID_Onec']);
      const schoolAdmissionYear = toStr(row['SchoolAdmissionYear_Onec']);
      const gpax = toStr(row['GPAX_Onec']);
      const prefixCode = toStr(row['PrefixID_Onec']);
      const genderCode = toStr(row['GenderID_Onec']);
      const nationalityCode = toStr(row['NationalityID_Onec']);
      const disabilityCode = toStr(row['DisabilityID_Onec']);
      const disadvantageCode = toStr(row['DisadvantageEducationID_Onec']);
      const departmentCode = toStr(row['DepartmentID_Onec']);
      const studentStatusCode = toStr(row['StudentStatusID_Onec']);
      const gradeLevelCode = toStr(row['GradeLevelID_Onec']);
      const subDistrictCode = toStr(row['SubDistrictID_Onec']);

      const finalPersonId = personId ?? passportId;
      if (!finalPersonId) {
        errors.push('ไม่มี PersonID และ PassportNumber');
      } else if (personId && !validateThaiPersonId(personId)) {
        errors.push(`PersonID "${personId}" ไม่ถูกต้อง (checksum ไม่ผ่าน)`);
      }

      if (!firstName) errors.push('FirstName ห้ามเป็นค่าว่าง');
      if (!lastName) errors.push('LastName ห้ามเป็นค่าว่าง');
      if (!academicYear) errors.push('AcademicYear ห้ามเป็นค่าว่าง');
      if (!semester) errors.push('Semester ห้ามเป็นค่าว่าง');

      const prefix = prefixCode ? ctx.prefixMap.get(prefixCode) : undefined;
      const gender = genderCode ? ctx.genderMap.get(genderCode) : undefined;
      const nationality = nationalityCode
        ? ctx.nationalityMap.get(nationalityCode)
        : undefined;
      const disability = disabilityCode
        ? ctx.disabilityMap.get(disabilityCode)
        : undefined;
      const disadvantage = disadvantageCode
        ? ctx.disadvantageMap.get(disadvantageCode)
        : undefined;
      const department = departmentCode
        ? ctx.departmentMap.get(departmentCode)
        : undefined;
      const studentStatus = studentStatusCode
        ? ctx.studentStatusMap.get(studentStatusCode)
        : undefined;
      const gradeLevel = gradeLevelCode
        ? ctx.gradeLevelMap.get(gradeLevelCode)
        : undefined;
      const town = subDistrictCode
        ? ctx.townMap.get(subDistrictCode)
        : undefined;
      const school = schoolCode ? ctx.schoolMap.get(schoolCode) : undefined;

      if (prefixCode && !prefix)
        errors.push(`PrefixID "${prefixCode}" ไม่มีในระบบ`);
      if (genderCode && !gender)
        errors.push(`GenderID "${genderCode}" ไม่มีในระบบ`);
      if (nationalityCode && !nationality)
        errors.push(`NationalityID "${nationalityCode}" ไม่มีในระบบ`);
      if (disabilityCode && !disability)
        errors.push(`DisabilityID "${disabilityCode}" ไม่มีในระบบ`);
      if (disadvantageCode && !disadvantage)
        errors.push(
          `DisadvantageEducationID "${disadvantageCode}" ไม่มีในระบบ`,
        );
      if (departmentCode && !department)
        errors.push(`DepartmentID "${departmentCode}" ไม่มีในระบบ`);
      if (studentStatusCode && !studentStatus)
        errors.push(`StudentStatusID "${studentStatusCode}" ไม่มีในระบบ`);
      if (gradeLevelCode && !gradeLevel)
        errors.push(`GradeLevelID "${gradeLevelCode}" ไม่มีในระบบ`);
      if (subDistrictCode && !town)
        errors.push(`SubDistrictID "${subDistrictCode}" ไม่มีในระบบ`);
      if (schoolCode && !school)
        errors.push(`SchoolID "${schoolCode}" ไม่มีในระบบ`);

      if (errors.length > 0) {
        ctx.result.errorCount++;
        ctx.result.errors.push({
          row: rowNumber,
          personId: finalPersonId ?? null,
          reasons: errors,
        });
        ctx.result.errorRawRows.push(row);
        continue;
      }

      validRows.push({
        rowNumber,
        rawRow: row,
        finalPersonId: finalPersonId!,
        passportId,
        firstName: firstName!,
        middleName,
        lastName: lastName!,
        villageNumber: toStr(row['VillageNumber_Onec']),
        street: toStr(row['Street_Onec']),
        soi: toStr(row['Soi_Onec']),
        trok: toStr(row['Trok_Onec']),
        academicYear: academicYear!,
        semester: semester!,
        schoolAdmissionYear,
        gpax,
        prefix,
        gender,
        nationality,
        disability,
        disadvantage,
        department,
        studentStatus,
        gradeLevel,
        town,
        school,
      });
    }

    if (validRows.length === 0) return;

    // insert
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const vr of validRows) {
        // upsert student
        let student = ctx.studentByPersonId.get(vr.finalPersonId);

        if (!student) {
          student = queryRunner.manager.create(Student, {
            personId: vr.finalPersonId,
            passportId: vr.passportId ?? undefined,
            firstName: vr.firstName,
            middleName: vr.middleName ?? undefined,
            lastName: vr.lastName,
            villageNumber: vr.villageNumber ?? undefined,
            street: vr.street ?? undefined,
            soi: vr.soi ?? undefined,
            trok: vr.trok ?? undefined,
            prefix: vr.prefix,
            gender: vr.gender,
            nationality: vr.nationality,
            disability: vr.disability,
            disadvantage: vr.disadvantage,
            town: vr.town,
          });

          try {
            student = await queryRunner.manager.save(Student, student);
            ctx.studentByPersonId.set(vr.finalPersonId, student);
          } catch (err: any) {
            // PostgreSQL unique violation = error code 23505
            if (err.code === '23505') {
              const existing = await queryRunner.manager.findOne(Student, {
                where: { personId: vr.finalPersonId },
                withDeleted: true,
              });
              if (existing) {
                student = existing;
                ctx.studentByPersonId.set(vr.finalPersonId, student);
              } else {
                throw err;
              }
            } else {
              throw err;
            }
          }
        }

        // เช็ค dupe per_term
        const perTermKey = `${student.id}_${vr.academicYear}_${vr.semester}_${vr.school?.id}`;
        if (ctx.existingPerTermKeys.has(perTermKey)) {
          ctx.result.skippedCount++;
          ctx.result.skipped.push({
            row: vr.rowNumber,
            personId: vr.finalPersonId,
            reason: `ข้อมูลซ้ำ (PersonID + ปีการศึกษา ${vr.academicYear} เทอม ${vr.semester} โรงเรียนเดิม)`,
          });
          continue;
        }

        // insert per_term
        const perTerm = queryRunner.manager.create(StudentPerTerm, {
          student,
          school: vr.school,
          academicYear: vr.academicYear,
          semester: vr.semester,
          schoolAdmissionYear: vr.schoolAdmissionYear ?? undefined,
          gpax: vr.gpax ?? undefined,
          gradeLevel: vr.gradeLevel,
          studentStatus: vr.studentStatus,
          department: vr.department,
        });

        await queryRunner.manager.save(StudentPerTerm, perTerm);
        ctx.existingPerTermKeys.add(perTermKey);
        ctx.result.successCount++;
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      for (const vr of validRows) {
        ctx.result.errorCount++;
        ctx.result.errors.push({
          row: vr.rowNumber,
          personId: vr.finalPersonId,
          reasons: [`Batch insert ล้มเหลว: ${(err as Error).message}`],
        });
      }
    } finally {
      await queryRunner.release();
    }
  }
}
