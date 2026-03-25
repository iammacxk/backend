type DropoutWithLocation = StudentPerTerm & {
  province: string | null;
  district: string | null;
  subdistrict: string | null;
};
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Disadvantage } from 'src/lookups/disadvantage.entity';
import { StudentPerTerm } from 'src/student-per-term/entities/student-per-term.entity';
import { Student } from 'src/students/entities/student.entity';
import { DropoutStudent } from 'src/dropout-student/entities/dropout-student.entity';
import { School } from 'src/schools/entities/school.entity';
import { Town } from 'src/lookups/town.entity';

@Injectable()
export class ReportDropOutStudentService {
  constructor(
    @InjectRepository(StudentPerTerm)
    private readonly repo: Repository<StudentPerTerm>,

    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,

    @InjectRepository(Disadvantage)
    private readonly disadvantageRepo: Repository<Disadvantage>,

    @InjectRepository(DropoutStudent)
    private readonly dropoutRepo: Repository<DropoutStudent>,

    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,
  ) {}

  // ชั้นสุดท้ายที่ถือว่า "จบ"
  private terminalGrades = [10, 17, 26];

  private getPreviousTerm(academicYear: string, semester: string) {
    if (semester === '1') {
      return {
        prevYear: (Number(academicYear) - 1).toString(),
        prevSemester: '2',
      };
    }
    return { prevYear: academicYear, prevSemester: '1' };
  }

  // ── helper: โหลด StudentPerTerm พร้อม relations ──────────────────────────
  private findTerms(where: object): Promise<StudentPerTerm[]> {
    return this.repo.find({
      where,
      relations: ['student', 'school', 'gradeLevel', 'department'],
    });
  }

  // ── จุดเริ่มต้น ────────────────────────────────────────────────────────────
  async calculateDropout(filter: {
    academicYear?: string;
    semester?: string;
    gradeLevelId?: number;
    schoolId?: number;
    departmentId?: number;
    province?: string;
    district?: string;
    subdistrict?: string;
  }) {
    const { academicYear, semester } = filter;

    if (academicYear && semester) {
      return this.calculateSingleTerm({
        ...filter,
        academicYear, // force ให้เป็น string
        semester, // force ให้เป็น string
      });
    }

    if (academicYear && !semester) {
      return this.calculateByYearFlexible({ ...filter, academicYear });
    }

    if (!academicYear && semester) {
      throw new Error('semester ต้องใช้คู่กับ academicYear');
    }

    return this.calculateAll(filter);
  }

  // ── คำนวณ dropout เฉพาะปี + เทอม ─────────────────────────────────────────
  private async calculateSingleTerm(filter: {
    academicYear: string;
    semester: string;
    gradeLevelId?: number;
    schoolId?: number;
    departmentId?: number;
    province?: string;
    district?: string;
    subdistrict?: string;
  }) {
    const {
      academicYear,
      semester,
      gradeLevelId,
      schoolId,
      departmentId,
      province,
      district,
      subdistrict,
    } = filter;
    const { prevYear, prevSemester } = this.getPreviousTerm(
      academicYear,
      semester,
    );

    // รัน parallel: โหลด prev term เต็ม + ดึงแค่ student IDs ของ current term
    const [prev, currentRaw] = await Promise.all([
      this.findTerms({
        academicYear: prevYear,
        semester: prevSemester,
        deletedAt: IsNull(),
      }),
      this.repo
        .createQueryBuilder('spt')
        .innerJoin('spt.student', 'student')
        .select('student.id', 'studentId')
        .where('spt.academicYear = :academicYear', { academicYear })
        .andWhere('spt.semester = :semester', { semester })
        .andWhere('spt.deletedAt IS NULL')
        .getRawMany<{ studentId: number }>(),
    ]);

    // เช็คด้วย student.id (relation)
    const currentSet = new Set(currentRaw.map((r) => r.studentId));

    const dropout: StudentPerTerm[] = [];
    const graduated: StudentPerTerm[] = [];

    for (const s of prev) {
      if (!currentSet.has(s.student?.id)) {
        const isTerminal = this.terminalGrades.includes(s.gradeLevel?.id ?? -1);
        const isFinalSemester = s.semester === '2';

        if (isTerminal && isFinalSemester) {
          graduated.push(s);
        } else {
          dropout.push(s);
        }
      }
    }

    const result = this.applyFilters(
      dropout,
      gradeLevelId,
      schoolId,
      departmentId,
    );
    const enrichedReason = await this.enrichDropoutWithReason(result);
    const enrichedLocation = await this.enrichLocation(enrichedReason);

    const enriched = this.applyLocationFilters(
      enrichedLocation,
      province,
      district,
      subdistrict,
    );
    const external = await this.combineWithExternalDropout(
      result,
      academicYear,
      gradeLevelId,
    );

    return {
      totalDropout: enriched.length,
      totalExternal: external.externalCount,
      totalDropoutCombined: enriched.length + external.externalCount,
      totalGraduated: graduated.length,
      dropoutList: enriched,
    };
  }

  // ── คำนวณ dropout รายปี (ไม่ระบุเทอม) ────────────────────────────────────
  private async calculateByYearFlexible(filter: {
    academicYear: string;
    gradeLevelId?: number;
    schoolId?: number;
    departmentId?: number;
    province?: string;
    district?: string;
    subdistrict?: string;
  }) {
    const {
      academicYear,
      gradeLevelId,
      schoolId,
      departmentId,
      province,
      district,
      subdistrict,
    } = filter;

    const nextYearStr = (Number(academicYear) + 1).toString();

    // รัน parallel: โหลด current year เต็ม + ดึงแค่ student IDs ของ next year
    const [currentYearStudents, nextRaw] = await Promise.all([
      this.findTerms({ academicYear, deletedAt: IsNull() }),
      this.repo
        .createQueryBuilder('spt')
        .innerJoin('spt.student', 'student')
        .select('student.id', 'studentId')
        .where('spt.academicYear = :academicYear', {
          academicYear: nextYearStr,
        })
        .andWhere('spt.deletedAt IS NULL')
        .getRawMany<{ studentId: number }>(),
    ]);

    const nextSet = new Set(nextRaw.map((r) => r.studentId));

    const dropout: StudentPerTerm[] = [];
    const graduated: StudentPerTerm[] = [];

    for (const s of currentYearStudents) {
      if (!nextSet.has(s.student?.id)) {
        const isTerminal = this.terminalGrades.includes(s.gradeLevel?.id ?? -1);
        const isFinalSemester = s.semester === '2';

        if (isTerminal && isFinalSemester) {
          graduated.push(s);
        } else {
          dropout.push(s);
        }
      }
    }

    const result = this.applyFilters(
      dropout,
      gradeLevelId,
      schoolId,
      departmentId,
    );
    const enrichedReason = await this.enrichDropoutWithReason(result);
    const enrichedLocation = await this.enrichLocation(enrichedReason);

    const enriched = this.applyLocationFilters(
      enrichedLocation,
      province,
      district,
      subdistrict,
    );
    const external = await this.combineWithExternalDropout(
      result,
      academicYear,
      gradeLevelId,
    );

    return {
      totalDropout: enriched.length,
      totalExternal: external.externalCount,
      totalDropoutCombined: enriched.length + external.externalCount,
      totalGraduated: graduated.length,
      dropoutList: enriched,
    };
  }

  // ── คำนวณ dropout ทั้งระบบ ────────────────────────────────────────────────
  private async calculateAll(filter: {
    gradeLevelId?: number;
    schoolId?: number;
    departmentId?: number;
    province?: string;
    district?: string;
    subdistrict?: string;
  }) {
    const { gradeLevelId, schoolId, departmentId } = filter;

    // Pass 1: โหลดเบา — แค่ student.id + gradeLevel.id เพื่อเปรียบเทียบ term
    const allLight = await this.repo
      .createQueryBuilder('spt')
      .innerJoinAndSelect('spt.student', 'student')
      .leftJoinAndSelect('spt.gradeLevel', 'gradeLevel')
      .select([
        'spt.id',
        'spt.academicYear',
        'spt.semester',
        'student.id',
        'gradeLevel.id',
      ])
      .where('spt.deletedAt IS NULL')
      .getMany();

    const grouped = new Map<string, typeof allLight>();
    for (const s of allLight) {
      const key = `${s.academicYear}-${s.semester}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(s);
    }

    const keys = Array.from(grouped.keys()).sort((a, b) => {
      const [yearA, semA] = a.split('-').map(Number);
      const [yearB, semB] = b.split('-').map(Number);
      return yearA !== yearB ? yearA - yearB : semA - semB;
    });

    let totalGraduated = 0;
    const dropoutIds: number[] = [];

    for (let i = 1; i < keys.length; i++) {
      const prev = grouped.get(keys[i - 1]) ?? [];
      const current = grouped.get(keys[i]) ?? [];
      const currentSet = new Set(current.map((s) => s.student?.id));

      for (const s of prev) {
        if (!currentSet.has(s.student?.id)) {
          const isTerminal = this.terminalGrades.includes(
            s.gradeLevel?.id ?? -1,
          );
          const isFinalSemester = s.semester === '2';

          if (isTerminal && isFinalSemester) {
            totalGraduated++;
          } else {
            dropoutIds.push(s.id);
          }
        }
      }
    }

    // Pass 2: โหลด full details เฉพาะ dropout records ที่หาได้จาก pass 1
    const dropoutList: StudentPerTerm[] = dropoutIds.length
      ? await this.repo.find({
          where: { id: In(dropoutIds) },
          relations: ['student', 'school', 'gradeLevel', 'department'],
        })
      : [];

    const result = this.applyFilters(
      dropoutList,
      gradeLevelId,
      schoolId,
      departmentId,
    );
    const enrichedReason = await this.enrichDropoutWithReason(result);
    const enrichedLocation = await this.enrichLocation(enrichedReason);
    const enriched = this.applyLocationFilters(
      enrichedLocation,
      filter.province,
      filter.district,
      filter.subdistrict,
    );
    const external = await this.combineWithExternalDropout(
      result,
      undefined,
      gradeLevelId,
    );

    return {
      totalDropout: enriched.length,
      totalExternal: external.externalCount,
      totalDropoutCombined: enriched.length + external.externalCount,
      totalGraduated,
      dropoutList: enriched,
    };
  }

  // ── filter helper ─────────────────────────────────────────────────────────
  private applyFilters(
    list: StudentPerTerm[],
    gradeLevelId?: number,
    schoolId?: number,
    departmentId?: number,
  ): StudentPerTerm[] {
    let result = list;
    if (gradeLevelId)
      result = result.filter((s) => s.gradeLevel?.id === gradeLevelId);
    if (schoolId) result = result.filter((s) => s.school?.id === schoolId);
    if (departmentId)
      result = result.filter((s) => s.department?.id === departmentId);
    return result;
  }

  private applyLocationFilters(
    list: DropoutWithLocation[],
    province?: string,
    district?: string,
    subdistrict?: string,
  ): DropoutWithLocation[] {
    let result = list;

    if (province) {
      result = result.filter((d) => d.province === province);
    }

    if (district) {
      result = result.filter((d) => d.district === district);
    }

    if (subdistrict) {
      result = result.filter((d) => d.subdistrict === subdistrict);
    }

    return result;
  }

  // ── เติมจังหวัดให้ dropout ───────────────────────────────────────────────
  // ── เติมจังหวัด/อำเภอ/ตำบล ───────────────────────────────────────────────
  private async enrichLocation(
    dropoutList: StudentPerTerm[],
  ): Promise<DropoutWithLocation[]> {
    if (!dropoutList.length) return [];

    // step 1: เอา school_id
    const schoolIds = [
      ...new Set(dropoutList.map((d) => d.school?.id).filter(Boolean)),
    ] as number[];

    if (!schoolIds.length) {
      return dropoutList.map((d) => ({
        ...d,
        province: null,
        district: null,
        subdistrict: null,
      }));
    }

    // step 2: query school + town
    const schools = await this.schoolRepo.find({
      where: { id: In(schoolIds) },
      relations: ['town'],
    });

    // map school_id -> location
    const schoolLocationMap = new Map<
      number,
      {
        province: string | null;
        district: string | null;
        subdistrict: string | null;
      }
    >();

    for (const s of schools) {
      schoolLocationMap.set(s.id, {
        province: s.town?.CLS_PROVINCE ?? null,
        district: s.town?.CLS_DISTRICT ?? null,
        subdistrict: s.town?.CLS_SUBDISTRICT ?? null,
      });
    }

    // step 3: merge
    return dropoutList.map((d) => {
      const loc = d.school?.id ? schoolLocationMap.get(d.school.id) : undefined;

      return {
        ...d,
        province: loc?.province ?? null,
        district: loc?.district ?? null,
        subdistrict: loc?.subdistrict ?? null,
      };
    });
  }

  // ── trend ย้อนหลัง 6 ปี ──────────────────────────────────────────────────
  async getDropoutTrend(year: string, semester = '1') {
    const results: { year: string; dropout: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const y = (Number(year) - i).toString();
      const res = await this.calculateSingleTerm({ academicYear: y, semester });
      results.push({ year: y, dropout: res.totalDropout });
    }

    return results;
  }

  // ── เปรียบเทียบปีนี้กับปีที่แล้ว ─────────────────────────────────────────
  async getDropoutComparison(year: string, semester = '1') {
    const current = await this.calculateSingleTerm({
      academicYear: year,
      semester,
    });
    const prev = await this.calculateSingleTerm({
      academicYear: (Number(year) - 1).toString(),
      semester,
    });

    const diff = current.totalDropout - prev.totalDropout;

    return {
      current: current.totalDropout,
      previous: prev.totalDropout,
      diff,
      trend: diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'same',
    };
  }

  // ── เติมเหตุผล dropout ────────────────────────────────────────────────────
  private async enrichDropoutWithReason(dropoutList: StudentPerTerm[]) {
    const studentIds = [
      ...new Set(dropoutList.map((d) => d.student?.id).filter(Boolean)),
    ] as number[];
    if (studentIds.length === 0) return [];

    const students = await this.studentRepo.find({
      where: { id: In(studentIds) },
      relations: ['disadvantage'],
    });

    // map student.id → disadvantage
    const studentMap = new Map<number, Disadvantage | null>();
    for (const s of students) {
      studentMap.set(s.id, s.disadvantage ?? null);
    }

    return dropoutList.map((d) => {
      const disadvantage = studentMap.get(d.student?.id ?? -1);

      let reason: string;
      if (disadvantage?.id === 11) {
        reason = 'ไม่ทราบสาเหตุ';
      } else if (disadvantage) {
        reason = disadvantage.name;
      } else {
        reason = 'ไม่ทราบสาเหตุ';
      }

      return { ...d, dropoutReason: reason };
    });
  }

  // ── รวม external dropout ──────────────────────────────────────────────────
  private async combineWithExternalDropout(
    dropoutList: StudentPerTerm[],
    academicYear?: string,
    gradeLevelId?: number,
  ) {
    const studentIds = [
      ...new Set(dropoutList.map((d) => d.student?.id).filter(Boolean)),
    ] as number[];

    const students = studentIds.length
      ? await this.studentRepo.find({ where: { id: In(studentIds) } })
      : [];

    const personIdSet = new Set(students.map((s) => s.personId));

    // DropoutStudent ใช้ relation gradeLevel ไม่ใช่ flat column
    const qb = this.dropoutRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.gradeLevel', 'gradeLevel')
      .where('d.deletedAt IS NULL');

    if (academicYear)
      qb.andWhere('d.academicYear = :academicYear', { academicYear });
    if (gradeLevelId)
      qb.andWhere('gradeLevel.id = :gradeLevelId', { gradeLevelId });

    const external = await qb.getMany();

    // ตัดซ้ำด้วย personId
    const extra = external.filter(
      (d) => d.personId && !personIdSet.has(d.personId),
    );

    return { externalCount: extra.length, externalList: extra };
  }

  // ── ข้อมูลแผนที่เด็กหลุด จัดกลุ่มตามจังหวัด ──────────────────────────────
  // ── ข้อมูลแผนที่เด็กหลุด จัดกลุ่มตามจังหวัด+เขต ──────────────────────────
  async getDropoutMapDistrict(filter: {
    academicYear?: string;
    semester?: string;
    gradeLevelId?: number;
    schoolId?: number;
    departmentId?: number;
    province?: string;
  }) {
    const result = await this.calculateDropout(filter);
    const dropoutList = result.dropoutList as (StudentPerTerm & {
      dropoutReason?: string;
    })[];

    const studentIds = [
      ...new Set(dropoutList.map((d) => d.student?.id).filter(Boolean)),
    ] as number[];

    if (studentIds.length === 0) return [];

    const students = await this.studentRepo.find({
      where: { id: In(studentIds) },
      relations: ['town'],
    });

    const studentTownMap = new Map<number, Town | null>();
    for (const s of students) {
      studentTownMap.set(s.id, s.town ?? null);
    }

    const groupMap = new Map<
      string,
      {
        province: string;
        district: string;
        count: number;
        reasons: Map<string, number>;
      }
    >();

    for (const d of dropoutList) {
      const town = studentTownMap.get(d.student?.id ?? -1);
      const province = town?.CLS_PROVINCE || 'ไม่ระบุ';
      const district = town?.CLS_DISTRICT || 'ไม่ระบุ';

      if (filter.province && province !== filter.province) continue;

      const key = `${province}::${district}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, { province, district, count: 0, reasons: new Map() });
      }

      const entry = groupMap.get(key)!;
      entry.count++;

      const reason = d.dropoutReason ?? 'ไม่ทราบสาเหตุ';
      entry.reasons.set(reason, (entry.reasons.get(reason) || 0) + 1);
    }

    return Array.from(groupMap.values()).map((entry) => ({
      province: entry.province,
      district: entry.district,
      count: entry.count,
      reasons: Array.from(entry.reasons.entries()).map(([reason, count]) => ({
        reason,
        count,
      })),
    }));
  }

  // ── ข้อมูลแผนที่เด็กหลุด จัดกลุ่มตามจังหวัด ──────────────────────────────
  async getDropoutMap(filter: {
    academicYear?: string;
    semester?: string;
    gradeLevelId?: number;
    schoolId?: number;
    departmentId?: number;
  }) {
    const result = await this.calculateDropout(filter);
    const dropoutList = result.dropoutList as (StudentPerTerm & {
      dropoutReason?: string;
    })[];

    // โหลด student พร้อม town relation
    const studentIds = [
      ...new Set(dropoutList.map((d) => d.student?.id).filter(Boolean)),
    ] as number[];

    if (studentIds.length === 0) return [];

    const students = await this.studentRepo.find({
      where: { id: In(studentIds) },
      relations: ['town'],
    });

    const studentTownMap = new Map<number, Town | null>();
    for (const s of students) {
      studentTownMap.set(s.id, s.town ?? null);
    }

    // จัดกลุ่มตามจังหวัด
    const provinceMap = new Map<
      string,
      { province: string; count: number; reasons: Map<string, number> }
    >();

    for (const d of dropoutList) {
      const town = studentTownMap.get(d.student?.id ?? -1);
      const province = town?.CLS_PROVINCE || 'ไม่ระบุ';

      if (!provinceMap.has(province)) {
        provinceMap.set(province, {
          province,
          count: 0,
          reasons: new Map(),
        });
      }

      const entry = provinceMap.get(province)!;
      entry.count++;

      const reason = d.dropoutReason ?? 'ไม่ทราบสาเหตุ';
      entry.reasons.set(reason, (entry.reasons.get(reason) || 0) + 1);
    }

    return Array.from(provinceMap.values()).map((entry) => ({
      province: entry.province,
      count: entry.count,
      reasons: Array.from(entry.reasons.entries()).map(([reason, count]) => ({
        reason,
        count,
      })),
    }));
  }
}
