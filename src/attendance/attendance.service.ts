import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance, AttendanceStatus } from './entities/attendance.entity';
import { AttendanceReason } from './entities/attendance-reason.entity';

export class CreateAttendanceDto {
  studentId: number;
  schoolId?: number;
  date: string;
  status: AttendanceStatus;
  reasonId?: number;
  academicYear: string;
  semester: string;
  note?: string;
  recordedBy?: string;
}

export class UpdateAttendanceDto {
  status?: AttendanceStatus;
  reasonId?: number;
  note?: string;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(AttendanceReason)
    private readonly reasonRepo: Repository<AttendanceReason>,
  ) {}

  // ========== ATTENDANCE REASONS ==========

  async findAllReasons() {
    return this.reasonRepo.find({ order: { code: 'ASC' } });
  }

  // ========== ATTENDANCE CRUD ==========

  async create(dto: CreateAttendanceDto): Promise<Attendance> {
    const attendance = this.attendanceRepo.create({
      student: { id: dto.studentId },
      school: dto.schoolId ? { id: dto.schoolId } : null,
      date: new Date(dto.date),
      status: dto.status,
      reason: dto.reasonId ? { id: dto.reasonId } : null,
      academicYear: dto.academicYear,
      semester: dto.semester,
      note: dto.note ?? null,
      recordedBy: dto.recordedBy ?? null,
    });
    return this.attendanceRepo.save(attendance);
  }

  async findByStudent(
    studentId: number,
    academicYear?: string,
    semester?: string,
  ) {
    const qb = this.attendanceRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.reason', 'reason')
      .leftJoinAndSelect('a.school', 'school')
      .where('a.student_id = :studentId', { studentId })
      .orderBy('a.date', 'DESC');

    if (academicYear)
      qb.andWhere('a.academicYear = :academicYear', { academicYear });
    if (semester) qb.andWhere('a.semester = :semester', { semester });

    return qb.getMany();
  }

  async findOne(id: number): Promise<Attendance> {
    const attendance = await this.attendanceRepo.findOne({
      where: { id },
      relations: ['student', 'school', 'reason'],
    });
    if (!attendance) throw new NotFoundException(`Attendance #${id} not found`);
    return attendance;
  }

  async update(id: number, dto: UpdateAttendanceDto): Promise<Attendance> {
    const attendance = await this.findOne(id);
    if (dto.status) attendance.status = dto.status;
    if (dto.reasonId !== undefined) {
      attendance.reason = dto.reasonId
        ? ({ id: dto.reasonId } as AttendanceReason)
        : null;
    }
    if (dto.note !== undefined) attendance.note = dto.note ?? null;
    return this.attendanceRepo.save(attendance);
  }

  async remove(id: number): Promise<void> {
    const attendance = await this.findOne(id);
    await this.attendanceRepo.remove(attendance);
  }

  // ========== SUMMARY สำหรับ Risk Detection ==========

  async getAbsentSummary(
    studentId: number,
    academicYear: string,
    semester: string,
  ) {
    const result = await this.attendanceRepo
      .createQueryBuilder('a')
      .leftJoin('a.reason', 'reason')
      .select([
        'a.status as status',
        'reason.category as category',
        'COUNT(a.id) as count',
      ])
      .where('a.student_id = :studentId', { studentId })
      .andWhere('a.academicYear = :academicYear', { academicYear })
      .andWhere('a.semester = :semester', { semester })
      .groupBy('a.status, reason.category')
      .getRawMany();

    let totalAbsent = 0;
    let unexcusedAbsent = 0;
    let excusedAbsent = 0;
    let late = 0;

    for (const row of result) {
      const count = Number(row.count);
      if (row.status === 'absent') {
        totalAbsent += count;
        if (row.category === 'unexcused') unexcusedAbsent += count;
        if (row.category === 'excused') excusedAbsent += count;
      }
      if (row.status === 'late') late += count;
    }

    return {
      totalAbsent,
      unexcusedAbsent,
      excusedAbsent,
      late,
      isRisk: unexcusedAbsent >= 3,
    };
  }
}
