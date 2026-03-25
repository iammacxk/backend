import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Student } from '../students/entities/student.entity';
import { DropoutStudent } from '../dropout-student/entities/dropout-student.entity';

export interface DropoutFilterDto {
  academicYear?: string;
  province?: string;
}

export interface DisabledFilterDto {
  province?: string;
}

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(DropoutStudent)
    private readonly dropoutRepo: Repository<DropoutStudent>,
  ) { }

  // ========== FILTER OPTIONS ==========

  async getFilterOptions() {
    const dropoutProvinces = await this.dropoutRepo
      .createQueryBuilder('d')
      .leftJoin('d.town', 'town')
      .select('DISTINCT town.CLS_PROVINCE', 'province')
      .where('town.CLS_PROVINCE IS NOT NULL')
      .orderBy('town.CLS_PROVINCE', 'ASC')
      .getRawMany();

    const academicYears = await this.dropoutRepo
      .createQueryBuilder('d')
      .select('DISTINCT d.academicYear', 'academicYear')
      .where('d.academicYear IS NOT NULL')
      .orderBy('d.academicYear', 'DESC')
      .getRawMany();

    const studentProvinces = await this.studentRepo
      .createQueryBuilder('s')
      .leftJoin('s.town', 'town')
      .select('DISTINCT town.CLS_PROVINCE', 'province')
      .where('town.CLS_PROVINCE IS NOT NULL')
      .orderBy('town.CLS_PROVINCE', 'ASC')
      .getRawMany();

    const allProvinces = [
      ...new Set([
        ...dropoutProvinces.map((r) => r.province),
        ...studentProvinces.map((r) => r.province),
      ]),
    ].sort();

    return {
      provinces: allProvinces,
      academicYears: academicYears.map((r) => r.academicYear),
    };
  }

  // ========== DROPOUT REPORT ==========

  async getDropoutSummary(filter: DropoutFilterDto) {
    const qb = this.dropoutRepo
      .createQueryBuilder('d')
      .leftJoin('d.town', 'town')
      .leftJoin('d.gradeLevel', 'gradeLevel')
      .select([
        'town.CLS_PROVINCE as province',
        'gradeLevel.name as gradeLevelName',
        'd.statusCodeCause as statusCodeCause',
        'COUNT(d.id) as total',
      ]);

    if (filter.academicYear) {
      qb.andWhere('d.academicYear = :academicYear', {
        academicYear: filter.academicYear,
      });
    }
    if (filter.province) {
      qb.andWhere('town.CLS_PROVINCE = :province', {
        province: filter.province,
      });
    }

    qb.groupBy('town.CLS_PROVINCE, gradeLevel.name, d.statusCodeCause');

    const rows = await qb.getRawMany();

    const byProvince: Record<string, number> = {};
    const byCause: Record<string, number> = {};
    const byGradeLevel: Record<string, number> = {};
    let total = 0;

    for (const row of rows) {
      const count = Number(row.total);
      total += count;

      if (row.province) {
        byProvince[row.province] = (byProvince[row.province] ?? 0) + count;
      }
      if (row.statusCodeCause) {
        byCause[row.statusCodeCause] =
          (byCause[row.statusCodeCause] ?? 0) + count;
      }
      if (row.gradeLevelName) {
        byGradeLevel[row.gradeLevelName] =
          (byGradeLevel[row.gradeLevelName] ?? 0) + count;
      }
    }

    return {
      total,
      byProvince: Object.entries(byProvince)
        .map(([province, count]) => ({ province, count }))
        .sort((a, b) => b.count - a.count),
      byCause: Object.entries(byCause)
        .map(([cause, count]) => ({ cause, count }))
        .sort((a, b) => b.count - a.count),
      byGradeLevel: Object.entries(byGradeLevel)
        .map(([gradeLevel, count]) => ({ gradeLevel, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async getDropoutList(filter: DropoutFilterDto) {
    const qb = this.dropoutRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.town', 'town')
      .leftJoinAndSelect('d.gradeLevel', 'gradeLevel')
      .leftJoinAndSelect('d.student', 'student');

    if (filter.academicYear) {
      qb.andWhere('d.academicYear = :academicYear', {
        academicYear: filter.academicYear,
      });
    }
    if (filter.province) {
      qb.andWhere('town.CLS_PROVINCE = :province', {
        province: filter.province,
      });
    }

    return qb.getMany();
  }

  async exportDropout(filter: DropoutFilterDto): Promise<Buffer> {
    const list = await this.getDropoutList(filter);

    const data = [
      [
        'ลำดับ',
        'PersonID',
        'ชื่อ',
        'นามสกุล',
        'โรงเรียน',
        'จังหวัด',
        'อำเภอ',
        'ตำบล',
        'ระดับชั้น',
        'ปีการศึกษา',
        'สาเหตุการออก',
        'หมายเหตุ',
      ],
      ...list.map((d, i) => [
        i + 1,
        d.personId ?? d.student?.personId ?? '-',
        d.student?.firstName ?? '-',
        d.student?.lastName ?? '-',
        d.schoolName ?? '-',
        d.town?.CLS_PROVINCE ?? '-',
        d.town?.CLS_DISTRICT ?? '-',
        d.town?.CLS_SUBDISTRICT ?? '-',
        d.gradeLevel?.name ?? '-',
        d.academicYear,
        d.statusCodeCause ?? '-',
        d.remark ?? '-',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dropout');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // ========== DISABLED STUDENTS REPORT ==========

  async getDisabledSummary(filter: DisabledFilterDto) {
    const qb = this.studentRepo
      .createQueryBuilder('s')
      .leftJoin('s.disability', 'disability')
      .leftJoin('s.town', 'town')
      .select([
        'disability.name as disability_name',
        'town.CLS_PROVINCE as province',
        'COUNT(s.id) as total',
      ])
      .where('s.disability_id IS NOT NULL')
      .andWhere("disability.code != '99'");

    if (filter.province) {
      qb.andWhere('town.CLS_PROVINCE = :province', {
        province: filter.province,
      });
    }

    qb.groupBy('disability.name, town.CLS_PROVINCE');

    const rows = await qb.getRawMany();

    const byDisabilityType: Record<string, number> = {};
    const byProvince: Record<string, number> = {};
    let total = 0;

    for (const row of rows) {
      const count = Number(row.total);
      total += count;

      // TypeORM getRawMany returns snake_case aliases
      const disabilityName = row.disability_name ?? row.disabilityName;
      if (disabilityName) {
        byDisabilityType[disabilityName] =
          (byDisabilityType[disabilityName] ?? 0) + count;
      }
      if (row.province) {
        byProvince[row.province] = (byProvince[row.province] ?? 0) + count;
      }
    }

    return {
      total,
      byDisabilityType: Object.entries(byDisabilityType)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      byProvince: Object.entries(byProvince)
        .map(([province, count]) => ({ province, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async getDisabledTypeSummary(filter: DisabledFilterDto) {
    const qb = this.studentRepo
      .createQueryBuilder('s')
      .leftJoin('s.disability', 'disability')
      .leftJoin('s.town', 'town')
      .select([
        'disability.name as disability_name',
        'disability.code as disability_code',
        'COUNT(s.id) as total',
      ])
      .where('s.disability_id IS NOT NULL')
      .andWhere("disability.code != '99'")
      .andWhere('disability.name IS NOT NULL');

    if (filter.province) {
      qb.andWhere('town.CLS_PROVINCE = :province', { province: filter.province });
    }

    qb.groupBy('disability.name, disability.code');

    const rows = await qb.getRawMany();
    const grandTotal = rows.reduce((sum, r) => sum + Number(r.total), 0);

    return rows
      .map((r) => ({
        // TypeORM getRawMany uses snake_case for aliases
        type: r.disability_name ?? r.disabilityName ?? r['disability.name'] ?? 'ไม่ระบุ',
        code: r.disability_code ?? r.disabilityCode ?? '',
        count: Number(r.total),
        percentage:
          grandTotal > 0
            ? ((Number(r.total) / grandTotal) * 100).toFixed(2)
            : '0.00',
      }))
      .sort((a, b) => b.count - a.count);
  }

  async getDisabledList(filter: DisabledFilterDto) {
    const qb = this.studentRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.disability', 'disability')
      .leftJoinAndSelect('s.town', 'town')
      .leftJoinAndSelect('s.gender', 'gender')
      .where('s.disability_id IS NOT NULL')
      .andWhere("disability.code != '99'");

    if (filter.province) {
      qb.andWhere('town.CLS_PROVINCE = :province', {
        province: filter.province,
      });
    }

    return qb.getMany();
  }

  async exportDisabled(filter: DisabledFilterDto): Promise<Buffer> {
    const list = await this.getDisabledList(filter);

    const data = [
      [
        'ลำดับ',
        'PersonID',
        'ชื่อ',
        'นามสกุล',
        'เพศ',
        'ประเภทความพิการ',
        'รหัสความพิการ',
        'จังหวัด',
        'อำเภอ',
      ],
      ...list.map((s, i) => [
        i + 1,
        s.personId ?? '-',
        s.firstName,
        s.lastName,
        s.gender?.name ?? '-',
        s.disability?.name ?? '-',
        s.disability?.code ?? '-',
        s.town?.CLS_PROVINCE ?? '-',
        s.town?.CLS_DISTRICT ?? '-',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 10 },
      { wch: 25 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Disabled Students');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
