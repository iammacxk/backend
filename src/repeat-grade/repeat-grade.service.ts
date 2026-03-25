import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { StudentPerTerm } from 'src/student-per-term/entities/student-per-term.entity';
import { Attendance2Service } from 'src/attendance2/attendance2.service';
type RepeatGradeItem = {
  studentId: number | null;
  personId: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  academicYear: string;
  semester: string | null;
  previousAcademicYear: string;
  previousSemester: string | null;
  schoolId: number | null;
  schoolCode: string | null;
  schoolName: string | null;
  gradeLevelId: number | null;
  gradeLevelCode: string | null;
  gradeLevelName: string | null;
  previousGradeLevelId: number | null;
  previousGradeLevelCode: string | null;
  previousGradeLevelName: string | null;
  departmentId: number | null;
  departmentCode: string | null;
  departmentName: string | null;

  gpax: string | null;

  absentDays: number;
  unexcusedDays: number;
  excusedDays: number;
  weightedDays: number;
  riskLevel: string | null;

  reason: string;
  isRepeated: boolean;
};

@Injectable()
export class RepeatGradeService {
  constructor(
    @InjectRepository(StudentPerTerm)
    private readonly studentPerTermRepo: Repository<StudentPerTerm>,
    private readonly attendance2Service: Attendance2Service,
  ) { }

  // ชั้นจบ ไม่ถือว่าซ้ำชั้น
  private readonly terminalGrades = [10, 17, 26];

  private async findAllTerms(): Promise<StudentPerTerm[]> {
    return this.studentPerTermRepo.find({
      where: { deletedAt: IsNull() },
      relations: ['student', 'school', 'gradeLevel', 'department'],
    });
  }

  private getYearNumber(value?: string | null): number {
    return Number(value ?? 0);
  }

  private getSemesterNumber(value?: string | null): number {
    return Number(value ?? 0);
  }

  private sortByYearAndSemester(list: StudentPerTerm[]): StudentPerTerm[] {
    return [...list].sort((a, b) => {
      const yearA = this.getYearNumber(a.academicYear);
      const yearB = this.getYearNumber(b.academicYear);

      if (yearA !== yearB) return yearA - yearB;

      const semA = this.getSemesterNumber(a.semester);
      const semB = this.getSemesterNumber(b.semester);

      return semA - semB;
    });
  }

  private pickLatestPerYear(list: StudentPerTerm[]): Map<string, StudentPerTerm> {
    const map = new Map<string, StudentPerTerm>();

    for (const row of list) {
      const year = row.academicYear;
      const existing = map.get(year);

      if (!existing) {
        map.set(year, row);
        continue;
      }

      const currentSem = this.getSemesterNumber(row.semester);
      const existingSem = this.getSemesterNumber(existing.semester);

      if (currentSem > existingSem) {
        map.set(year, row);
      }
    }

    return map;
  }

  private buildRepeatReason(risk?: {
    totalAbsentDays?: number;
    unexcusedDays?: number;
    excusedDays?: number;
    weightedDays?: number;
    riskLevel?: string;
  }): string {
    if (!risk) return 'ไม่ทราบสาเหตุ';

    if ((risk.totalAbsentDays ?? 0) > 0) {
      if (risk.riskLevel === 'high') {
        return 'ขาดเรียนสะสมเกินเกณฑ์ (เสี่ยงสูง)';
      }

      if (risk.riskLevel === 'medium') {
        return 'ขาดเรียนสะสมเกินเกณฑ์ (เสี่ยงกลาง)';
      }

      if (risk.riskLevel === 'watch') {
        return 'เริ่มมีความเสี่ยงจากการขาดเรียน';
      }

      return `ขาดเรียนสะสม ${risk.totalAbsentDays} วัน`;
    }

    return 'เหตุผลอื่น';
  }

  async findAllRepeatedStudents() {
    const allTerms = await this.findAllTerms();

    const studentMap = new Map<number, StudentPerTerm[]>();

    for (const row of allTerms) {
      const studentId = row.student?.id;
      if (!studentId) continue;

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, []);
      }

      studentMap.get(studentId)!.push(row);
    }

    const result: RepeatGradeItem[] = [];

    for (const [, terms] of studentMap.entries()) {
      const sortedTerms = this.sortByYearAndSemester(terms);
      const latestPerYear = this.pickLatestPerYear(sortedTerms);

      const years = Array.from(latestPerYear.keys()).sort(
        (a, b) => Number(a) - Number(b),
      );

      for (let i = 1; i < years.length; i++) {
        const currentYear = years[i];
        const previousYear = years[i - 1];

        // เทียบเฉพาะปีที่ต่อกันจริง เช่น 2565 -> 2566
        if (Number(currentYear) !== Number(previousYear) + 1) {
          continue;
        }

        const current = latestPerYear.get(currentYear);
        const previous = latestPerYear.get(previousYear);

        if (!current || !previous) continue;

        const currentGradeId = current.gradeLevel?.id;
        const previousGradeId = previous.gradeLevel?.id;

        if (!currentGradeId || !previousGradeId) continue;

        const isTerminal = this.terminalGrades.includes(previousGradeId);
        const isRepeated = currentGradeId === previousGradeId;

        if (!isRepeated || isTerminal) continue;

        const riskList = await this.attendance2Service.getStudentRiskList(
          current.academicYear,
          current.semester ?? undefined,
        );

        const riskMap = new Map<number, any>();
        for (const item of riskList) {
          riskMap.set(item.studentId, item);
        }

        const risk = riskMap.get(current.student?.id ?? -1);

        result.push({
          studentId: current.student?.id ?? null,
          personId: current.student?.personId ?? null,
          firstName: current.student?.firstName ?? null,
          lastName: current.student?.lastName ?? null,
          fullName: `${current.student?.firstName ?? ''} ${current.student?.lastName ?? ''}`.trim(),

          academicYear: current.academicYear,
          semester: current.semester ?? null,

          previousAcademicYear: previous.academicYear,
          previousSemester: previous.semester ?? null,

          schoolId: current.school?.id ?? null,
          schoolCode: current.school?.code ?? null,
          schoolName: current.school?.name ?? null,

          gradeLevelId: current.gradeLevel?.id ?? null,
          gradeLevelCode: current.gradeLevel?.code ?? null,
          gradeLevelName: current.gradeLevel?.name ?? null,

          previousGradeLevelId: previous.gradeLevel?.id ?? null,
          previousGradeLevelCode: previous.gradeLevel?.code ?? null,
          previousGradeLevelName: previous.gradeLevel?.name ?? null,

          departmentId: current.department?.id ?? null,
          departmentCode: current.department?.code ?? null,
          departmentName: current.department?.name ?? null,

          gpax: current.gpax ?? null,

          absentDays: risk?.totalAbsentDays ?? 0,
          unexcusedDays: risk?.unexcusedDays ?? 0,
          excusedDays: risk?.excusedDays ?? 0,
          weightedDays: risk?.weightedDays ?? 0,
          riskLevel: risk?.riskLevel ?? null,

          reason: this.buildRepeatReason(risk),
          isRepeated: true,
        });
      }
    }

    return result;
  }
}