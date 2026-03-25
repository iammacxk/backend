import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import * as path from 'path';

// path ไปยัง font ไทย (วางไว้ที่ src/export/fonts/)
const FONT_REGULAR = path.join(__dirname, 'fonts', 'Sarabun-Regular.ttf');
const FONT_BOLD = path.join(__dirname, 'fonts', 'Sarabun-Bold.ttf');
import { Attendance2 } from '../attendance2/entities/attendance2.entity';
import { AttendanceStatus } from '../attendance2/entities/attendance-status.enum';
import { StudentPerTerm } from '../student-per-term/entities/student-per-term.entity';
import { Student } from '../students/entities/student.entity';
import { DropoutStudent } from '../dropout-student/entities/dropout-student.entity';

// ---- risk helpers (เหมือน attendance2.service) ----
const getRiskLevel = (unexcused: number, excused: number): string => {
  const weighted = unexcused * 2 + excused * 0.5;
  if (weighted <= 1) return 'ปกติ';
  if (weighted < 3) return 'เฝ้าระวัง';
  if (weighted < 5) return 'เสี่ยงกลาง';
  return 'เสี่ยงสูง';
};

const TERMINAL_GRADES = [10, 17, 26];

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Attendance2)
    private readonly attendanceRepo: Repository<Attendance2>,

    @InjectRepository(StudentPerTerm)
    private readonly studentPerTermRepo: Repository<StudentPerTerm>,

    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,

    @InjectRepository(DropoutStudent)
    private readonly dropoutRepo: Repository<DropoutStudent>,
  ) {}

  // ================================================================
  // 1. นักเรียนเสี่ยงหลุด (attendance2)
  // ================================================================
  async getAttendanceRiskData(academicYear: string, semester?: string) {
    const records = await this.attendanceRepo.find({
      where: {
        status: AttendanceStatus.ABSENT,
        academicYear,
        ...(semester ? { semester } : {}),
      },
      relations: ['student', 'reason'],
    });

    const studentMap = new Map<
      number,
      { student: any; unexcused: number; excused: number }
    >();
    for (const rec of records) {
      const sid = rec.student.id;
      if (!studentMap.has(sid))
        studentMap.set(sid, { student: rec.student, unexcused: 0, excused: 0 });
      const entry = studentMap.get(sid)!;
      const category = rec.reason?.category;
      if (category === 'unexcused' || !category) entry.unexcused++;
      else entry.excused++;
    }

    return Array.from(studentMap.values()).map(
      ({ student, unexcused, excused }) => ({
        studentId: student.id,
        personId: student.personId ?? '-',
        firstName: student.firstName ?? '-',
        lastName: student.lastName ?? '-',
        unexcusedDays: unexcused,
        excusedDays: excused,
        totalAbsentDays: unexcused + excused,
        riskLevel: getRiskLevel(unexcused, excused),
      }),
    );
  }

  // ================================================================
  // 2. นักเรียนหลุดออกจากระบบ (dropout)
  // ================================================================
  async getDropoutData(academicYear?: string, semester?: string) {
    const all = await this.studentPerTermRepo.find({
      where: { deletedAt: IsNull() },
      relations: ['student', 'school', 'gradeLevel', 'department'],
    });

    if (!academicYear) {
      // ถ้าไม่ระบุปี return dropout table โดยตรง
      const dropouts = await this.dropoutRepo.find({
        relations: ['student', 'gradeLevel', 'town'],
      });
      return dropouts.map((d) => ({
        personId: d.personId ?? d.student?.personId ?? '-',
        firstName: d.student?.firstName ?? '-',
        lastName: d.student?.lastName ?? '-',
        gradeLevel: d.gradeLevel?.name ?? '-',
        academicYear: d.academicYear ?? '-',
        schoolName: d.schoolName ?? '-',
        statusCodeCause: d.statusCodeCause ?? '-',
        remark: d.remark ?? '-',
      }));
    }

    const currentYear = all.filter(
      (s) =>
        s.academicYear === academicYear &&
        (!semester || s.semester === semester),
    );
    const prevYear =
      semester === '1'
        ? all.filter(
            (s) =>
              s.academicYear === (Number(academicYear) - 1).toString() &&
              s.semester === '2',
          )
        : all.filter(
            (s) => s.academicYear === academicYear && s.semester === '1',
          );

    const currentSet = new Set(currentYear.map((s) => s.student?.id));

    return prevYear
      .filter((s) => {
        if (currentSet.has(s.student?.id)) return false;
        const isTerminal = TERMINAL_GRADES.includes(s.gradeLevel?.id ?? -1);
        return !(isTerminal && s.semester === '2');
      })
      .map((s) => ({
        personId: s.student?.personId ?? '-',
        firstName: s.student?.firstName ?? '-',
        lastName: s.student?.lastName ?? '-',
        gradeLevel: s.gradeLevel?.name ?? '-',
        department: s.department?.name ?? '-',
        school: s.school?.name ?? '-',
        academicYear: s.academicYear,
        semester: s.semester ?? '-',
      }));
  }
  async getDropoutSummaryByStatus(academicYear?: string, semester?: string) {
    const rows = await this.getDropoutData(academicYear, semester);

    const map = new Map<string, number>();
    for (const r of rows) {
      // narrow type — statusCodeCause มีเฉพาะ case ที่ไม่ระบุ academicYear
      const key =
        ('statusCodeCause' in r ? r.statusCodeCause : null) ?? 'ไม่ระบุสาเหตุ';
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    const total = rows.length;
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cause, count]) => ({
        cause,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(2) : '0.00',
      }));
  }
  // ================================================================
  // 3. เลื่อนชั้น / ซ้ำชั้น (repeat-grade)
  // ================================================================
  async getRepeatGradeData() {
    const all = await this.studentPerTermRepo.find({
      where: { deletedAt: IsNull() },
      relations: ['student', 'school', 'gradeLevel', 'department'],
    });

    const studentMap = new Map<number, StudentPerTerm[]>();
    for (const row of all) {
      const id = row.student?.id;
      if (!id) continue;
      if (!studentMap.has(id)) studentMap.set(id, []);
      studentMap.get(id)!.push(row);
    }

    const result: any[] = [];

    for (const [, terms] of studentMap) {
      const sorted = [...terms].sort((a, b) => {
        const ya = Number(a.academicYear ?? 0);
        const yb = Number(b.academicYear ?? 0);
        if (ya !== yb) return ya - yb;
        return Number(a.semester ?? 0) - Number(b.semester ?? 0);
      });

      // latest per year
      const latestPerYear = new Map<string, StudentPerTerm>();
      for (const row of sorted) {
        const existing = latestPerYear.get(row.academicYear);
        if (!existing || Number(row.semester) > Number(existing.semester)) {
          latestPerYear.set(row.academicYear, row);
        }
      }

      const years = Array.from(latestPerYear.keys()).sort(
        (a, b) => Number(a) - Number(b),
      );

      for (let i = 1; i < years.length; i++) {
        const curr = latestPerYear.get(years[i])!;
        const prev = latestPerYear.get(years[i - 1])!;
        if (Number(years[i]) !== Number(years[i - 1]) + 1) continue;

        const currGradeId = curr.gradeLevel?.id;
        const prevGradeId = prev.gradeLevel?.id;
        if (!currGradeId || !prevGradeId) continue;
        if (TERMINAL_GRADES.includes(prevGradeId)) continue;
        if (currGradeId !== prevGradeId) continue;

        result.push({
          personId: curr.student?.personId ?? '-',
          firstName: curr.student?.firstName ?? '-',
          lastName: curr.student?.lastName ?? '-',
          school: curr.school?.name ?? '-',
          gradeLevel: curr.gradeLevel?.name ?? '-',
          academicYear: curr.academicYear,
          previousAcademicYear: prev.academicYear,
          department: curr.department?.name ?? '-',
        });
      }
    }

    return result;
  }

  // ================================================================
  // 4. นักเรียนพิการ
  // ================================================================
  // หลัง
  async getDisabilityData(academicYear?: string, semester?: string) {
    const qb = this.studentPerTermRepo
      .createQueryBuilder('spt')
      .innerJoinAndSelect('spt.student', 's')
      .leftJoinAndSelect('s.disability', 'disability')
      .leftJoinAndSelect('s.gender', 'gender')
      .leftJoinAndSelect('s.nationality', 'nationality')
      .leftJoinAndSelect('spt.school', 'school')
      .leftJoinAndSelect('spt.gradeLevel', 'gradeLevel')
      .leftJoinAndSelect('spt.department', 'department')
      .where('spt.deletedAt IS NULL')
      .andWhere('s.deletedAt IS NULL')
      .andWhere('disability.id IS NOT NULL')
      .andWhere('disability.id != :noDisability', { noDisability: 10 });

    if (academicYear) {
      qb.andWhere('spt.academicYear = :academicYear', { academicYear });
    }
    if (semester) {
      qb.andWhere('spt.semester = :semester', { semester });
    }

    const rows = await qb.getMany();

    return rows.map((spt) => ({
      personId: spt.student?.personId ?? '-',
      firstName: spt.student?.firstName ?? '-',
      lastName: spt.student?.lastName ?? '-',
      disability: (spt.student?.disability as any)?.name ?? '-',
      gender: (spt.student?.gender as any)?.name ?? '-',
      nationality: (spt.student?.nationality as any)?.name ?? '-',
      gradeLevel: spt.gradeLevel?.name ?? '-',
      school: spt.school?.name ?? '-',
      department: spt.department?.name ?? '-',
      academicYear: spt.academicYear ?? '-',
      semester: spt.semester ?? '-',
    }));
  }
  async getDisabilitySummary(academicYear?: string, semester?: string) {
    const rows = await this.getDisabilityData(academicYear, semester);
    // getDisabilityData แล้วกรอง disability.id != 99 อยู่แล้ว

    const map = new Map<string, number>();
    for (const r of rows) {
      const key = r.disability ?? 'ไม่ระบุ';
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ disabilityType: type, count }));
  }
  // ================================================================
  // XLSX generators
  // ================================================================
  async generateXlsx(type: string, params: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'STS Export';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('รายงาน');

    // header style
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2C3E50' },
      },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const rowStyle: Partial<ExcelJS.Style> = {
      border: {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      },
    };

    let data: any[] = [];
    let columns: { header: string; key: string; width: number }[] = [];
    let title = '';

    switch (type) {
      case 'attendance-risk': {
        data = await this.getAttendanceRiskData(
          params.academicYear,
          params.semester,
        );
        title = `รายงานนักเรียนเสี่ยงหลุด ปีการศึกษา ${params.academicYear}${params.semester ? ` เทอม ${params.semester}` : ''}`;
        columns = [
          { header: 'รหัสนักเรียน', key: 'personId', width: 20 },
          { header: 'ชื่อ', key: 'firstName', width: 20 },
          { header: 'นามสกุล', key: 'lastName', width: 20 },
          { header: 'ขาดไม่มีเหตุ (วัน)', key: 'unexcusedDays', width: 20 },
          { header: 'ขาดมีเหตุ (วัน)', key: 'excusedDays', width: 18 },
          { header: 'รวมขาด (วัน)', key: 'totalAbsentDays', width: 15 },
          { header: 'ระดับความเสี่ยง', key: 'riskLevel', width: 18 },
        ];
        break;
      }
      case 'dropout': {
        data = await this.getDropoutData(params.academicYear, params.semester);
        title = `รายงานนักเรียนหลุดออกจากระบบ${params.academicYear ? ` ปีการศึกษา ${params.academicYear}` : ''}`;
        columns = [
          { header: 'รหัสนักเรียน', key: 'personId', width: 20 },
          { header: 'ชื่อ', key: 'firstName', width: 20 },
          { header: 'นามสกุล', key: 'lastName', width: 20 },
          { header: 'ระดับชั้น', key: 'gradeLevel', width: 15 },
          { header: 'สังกัด', key: 'department', width: 20 },
          { header: 'โรงเรียน', key: 'school', width: 30 },
          { header: 'ปีการศึกษา', key: 'academicYear', width: 15 },
          { header: 'เทอม', key: 'semester', width: 10 },
        ];
        break;
      }
      case 'repeat-grade': {
        data = await this.getRepeatGradeData();
        title = 'รายงานนักเรียนซ้ำชั้น';
        columns = [
          { header: 'รหัสนักเรียน', key: 'personId', width: 20 },
          { header: 'ชื่อ', key: 'firstName', width: 20 },
          { header: 'นามสกุล', key: 'lastName', width: 20 },
          { header: 'โรงเรียน', key: 'school', width: 30 },
          { header: 'ระดับชั้น', key: 'gradeLevel', width: 15 },
          { header: 'ปีการศึกษา (ซ้ำ)', key: 'academicYear', width: 18 },
          {
            header: 'ปีการศึกษา (ก่อนหน้า)',
            key: 'previousAcademicYear',
            width: 22,
          },
          { header: 'สังกัด', key: 'department', width: 20 },
        ];
        break;
      }
      // หลัง
      case 'disability': {
        data = await this.getDisabilityData(
          params.academicYear,
          params.semester,
        );
        title = `รายงานนักเรียนพิการ${params.academicYear ? ` ปีการศึกษา ${params.academicYear}` : ''}${params.semester ? ` เทอม ${params.semester}` : ''}`;
        columns = [
          { header: 'รหัสนักเรียน', key: 'personId', width: 20 },
          { header: 'ชื่อ', key: 'firstName', width: 20 },
          { header: 'นามสกุล', key: 'lastName', width: 20 },
          { header: 'ประเภทความพิการ', key: 'disability', width: 25 },
          { header: 'เพศ', key: 'gender', width: 12 },
          { header: 'สัญชาติ', key: 'nationality', width: 15 },
          { header: 'ระดับชั้น', key: 'gradeLevel', width: 15 },
          { header: 'โรงเรียน', key: 'school', width: 30 },
          { header: 'สังกัด', key: 'department', width: 20 },
          { header: 'ปีการศึกษา', key: 'academicYear', width: 15 },
          { header: 'เทอม', key: 'semester', width: 10 },
        ];
        break;
      }

      case 'disability-summary': {
        data = await this.getDisabilitySummary(
          params.academicYear,
          params.semester,
        );
        title = `สรุปประเภทนักเรียนพิการ${params.academicYear ? ` ปีการศึกษา ${params.academicYear}` : ''}${params.semester ? ` เทอม ${params.semester}` : ''}`;
        columns = [
          { header: 'ประเภทความพิการ', key: 'disabilityType', width: 30 },
          { header: 'จำนวน (คน)', key: 'count', width: 15 },
        ];
        break;
      }
    }

    // title row
    sheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };
    sheet.getRow(1).height = 30;

    // generated at row
    sheet.mergeCells(2, 1, 2, columns.length);
    sheet.getCell('A2').value =
      `ส่งออกเมื่อ: ${new Date().toLocaleString('th-TH')}`;
    sheet.getCell('A2').font = { size: 10, color: { argb: 'FF888888' } };
    sheet.getCell('A2').alignment = { horizontal: 'right' };
    sheet.getRow(2).height = 18;

    // blank row
    sheet.getRow(3).height = 6;

    // set columns
    sheet.columns = columns.map((c) => ({ key: c.key, width: c.width }));

    // header row (row 4)
    const headerRow = sheet.getRow(4);
    columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      Object.assign(cell, headerStyle);
    });
    headerRow.height = 22;

    // data rows
    data.forEach((row, rowIdx) => {
      const excelRow = sheet.getRow(rowIdx + 5);
      columns.forEach((col, colIdx) => {
        const cell = excelRow.getCell(colIdx + 1);
        cell.value = row[col.key] ?? '-';
        Object.assign(cell, rowStyle);
        // zebra
        if (rowIdx % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F5F5' },
          };
        }
        // risk level color
        if (col.key === 'riskLevel') {
          const colors: Record<string, string> = {
            เสี่ยงสูง: 'FFFFE0E0',
            เสี่ยงกลาง: 'FFFFF3CD',
            เฝ้าระวัง: 'FFE8F4FD',
            ปกติ: 'FFE8F8E8',
          };
          const bg = colors[String(row[col.key])];
          if (bg)
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: bg },
            };
        }
      });
    });

    // summary row
    const summaryRow = sheet.getRow(data.length + 5);
    summaryRow.getCell(1).value =
      `ทั้งหมด ${data.length.toLocaleString()} รายการ`;
    summaryRow.getCell(1).font = { bold: true, size: 11 };
    summaryRow.height = 20;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ================================================================
  // PDF generators
  // ================================================================
  async generatePdf(type: string, params: any): Promise<Buffer> {
    let data: any[] = [];
    let title = '';
    let columns: { header: string; key: string }[] = [];

    switch (type) {
      case 'attendance-risk': {
        data = await this.getAttendanceRiskData(
          params.academicYear,
          params.semester,
        );
        title = `รายงานนักเรียนเสี่ยงหลุด ปีการศึกษา ${params.academicYear}${params.semester ? ` เทอม ${params.semester}` : ''}`;
        columns = [
          { header: 'รหัสนักเรียน', key: 'personId' },
          { header: 'ชื่อ', key: 'firstName' },
          { header: 'นามสกุล', key: 'lastName' },
          { header: 'ขาดไม่มีเหตุ (วัน)', key: 'unexcusedDays' },
          { header: 'ขาดมีเหตุ (วัน)', key: 'excusedDays' },
          { header: 'รวมขาด (วัน)', key: 'totalAbsentDays' }, // ← ขาดใน PDF เดิม
          { header: 'ระดับความเสี่ยง', key: 'riskLevel' },
        ];
        break;
      }
      case 'dropout': {
        data = await this.getDropoutData(params.academicYear, params.semester);
        title = `รายงานนักเรียนหลุดออกจากระบบ${params.academicYear ? ` ปีการศึกษา ${params.academicYear}` : ''}`;
        columns = [
          { header: 'รหัสนักเรียน', key: 'personId' },
          { header: 'ชื่อ', key: 'firstName' },
          { header: 'นามสกุล', key: 'lastName' },
          { header: 'ระดับชั้น', key: 'gradeLevel' },
          { header: 'สังกัด', key: 'department' }, // ← ขาดใน PDF เดิม
          { header: 'โรงเรียน', key: 'school' },
          { header: 'ปีการศึกษา', key: 'academicYear' },
          { header: 'เทอม', key: 'semester' }, // ← ขาดใน PDF เดิม
        ];
        break;
      }
      case 'repeat-grade': {
        data = await this.getRepeatGradeData();
        title = 'รายงานนักเรียนซ้ำชั้น';
        columns = [
          { header: 'รหัสนักเรียน', key: 'personId' },
          { header: 'ชื่อ', key: 'firstName' },
          { header: 'นามสกุล', key: 'lastName' },
          { header: 'โรงเรียน', key: 'school' }, // ← ขาดใน PDF เดิม
          { header: 'ระดับชั้น', key: 'gradeLevel' },
          { header: 'ปีที่ซ้ำ', key: 'academicYear' },
          { header: 'ปีก่อนหน้า', key: 'previousAcademicYear' },
          { header: 'สังกัด', key: 'department' }, // ← ขาดใน PDF เดิม
        ];
        break;
      }
      case 'disability': {
        data = await this.getDisabilityData(
          params.academicYear,
          params.semester,
        );
        title = `รายงานนักเรียนพิการ${params.academicYear ? ` ปีการศึกษา ${params.academicYear}` : ''}${params.semester ? ` เทอม ${params.semester}` : ''}`;
        columns = [
          { header: 'รหัสนักเรียน', key: 'personId' },
          { header: 'ชื่อ', key: 'firstName' },
          { header: 'นามสกุล', key: 'lastName' },
          { header: 'ประเภทความพิการ', key: 'disability' },
          { header: 'เพศ', key: 'gender' },
          { header: 'สัญชาติ', key: 'nationality' }, // ← ขาดใน PDF เดิม
          { header: 'ระดับชั้น', key: 'gradeLevel' },
          { header: 'โรงเรียน', key: 'school' },
          { header: 'สังกัด', key: 'department' }, // ← ขาดใน PDF เดิม
          { header: 'ปีการศึกษา', key: 'academicYear' }, // ← ขาดใน PDF เดิม
          { header: 'เทอม', key: 'semester' }, // ← ขาดใน PDF เดิม
        ];
        break;
      }
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        layout: 'landscape',
        bufferPages: true,
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ---- register Sarabun font ----
      doc.registerFont('SarabunRegular', FONT_REGULAR);
      doc.registerFont('SarabunBold', FONT_BOLD);

      // ---- title ----
      doc.fontSize(16).font('SarabunBold').text(title, { align: 'center' });
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .font('SarabunRegular')
        .fillColor('#888888')
        .text(
          `ส่งออกเมื่อ: ${new Date().toLocaleString('th-TH')} | ทั้งหมด ${data.length.toLocaleString()} รายการ`,
          { align: 'right' },
        );
      doc.fillColor('#000000');
      doc.moveDown(0.5);

      // ---- table ----
      const pageWidth = doc.page.width - 80;
      const colWidth = pageWidth / columns.length;
      const rowHeight = 35;
      let y = doc.y;

      // draw header row
      doc.rect(40, y, pageWidth, rowHeight).fill('#2C3E50');
      doc.fillColor('#FFFFFF').fontSize(10).font('SarabunBold');
      columns.forEach((col, i) => {
        doc.text(col.header, 40 + i * colWidth + 4, y + 5, {
          width: colWidth - 8,
          align: 'left',
          lineBreak: false,
        });
      });
      doc.fillColor('#000000').font('SarabunRegular');
      y += rowHeight;

      // draw data rows
      data.slice(0, 500).forEach((row, rowIdx) => {
        if (y + rowHeight > doc.page.height - 60) {
          doc.addPage();
          y = 40;

          // re-draw header on new page
          doc.rect(40, y, pageWidth, rowHeight).fill('#2C3E50');
          doc.fillColor('#FFFFFF').fontSize(10).font('SarabunBold');
          columns.forEach((col, i) => {
            doc.text(col.header, 40 + i * colWidth + 4, y + 5, {
              width: colWidth - 8,
              align: 'left',
              lineBreak: false,
            });
          });
          doc.fillColor('#000000').font('SarabunRegular');
          y += rowHeight;
        }

        const bg = rowIdx % 2 === 0 ? '#FFFFFF' : '#F5F5F5';
        doc.rect(40, y, pageWidth, rowHeight).fill(bg);
        doc.fillColor('#000000').fontSize(9);

        columns.forEach((col, i) => {
          const val = String(row[col.key] ?? '-');
          doc.text(val, 40 + i * colWidth + 4, y + 5, {
            width: colWidth - 8,
            align: 'left',
            lineBreak: false,
          });
        });

        // border bottom
        doc
          .moveTo(40, y + rowHeight)
          .lineTo(40 + pageWidth, y + rowHeight)
          .strokeColor('#DDDDDD')
          .lineWidth(0.5)
          .stroke();

        y += rowHeight;
      });

      // ---- note ถ้าข้อมูลเกิน 500 ----
      if (data.length > 500) {
        if (y + 30 > doc.page.height - 40) doc.addPage();
        doc
          .moveDown()
          .fontSize(9)
          .font('SarabunRegular')
          .fillColor('#888888')
          .text(
            `* แสดงเฉพาะ 500 รายการแรก (ทั้งหมด ${data.length.toLocaleString()} รายการ) กรุณา export xlsx เพื่อดูข้อมูลครบถ้วน`,
          );
      }

      // ---- footer page number ----
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .font('SarabunRegular')
          .fillColor('#AAAAAA')
          .text(
            `หน้า ${i - range.start + 1} / ${range.count}`,
            40,
            doc.page.height - 30,
            { align: 'right', width: doc.page.width - 80 },
          );
      }

      doc.flushPages();
      doc.end();
    });
  }
}
