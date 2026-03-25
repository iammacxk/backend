import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateAttendance2Dto } from './dto/create-attendance2.dto';
import { UpdateAttendance2Dto } from './dto/update-attendance2.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Attendance2 } from './entities/attendance2.entity';
import { In, QueryFailedError, Repository } from 'typeorm';
import { AttendanceStatus } from './entities/attendance-status.enum';
import { Student } from 'src/students/entities/student.entity';
import { AttendanceReason2 } from 'src/attendance-reason2/entities/attendance-reason2.entity';
import { StudentRiskItem } from './entities/report-attendance2.entity';
import { StudentPerTerm } from 'src/student-per-term/entities/student-per-term.entity';
import { School } from 'src/schools/entities/school.entity';

@Injectable()
export class Attendance2Service {
  constructor(
    @InjectRepository(Attendance2)
    private attendanceRepo: Repository<Attendance2>,

    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,

    @InjectRepository(AttendanceReason2)
    private readonly reasonRepo: Repository<AttendanceReason2>,

    @InjectRepository(StudentPerTerm)
    private readonly studentPerTermRepo: Repository<StudentPerTerm>,

    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,
  ) {}

  //เพิ่มข้อมูล
  async create(dto: CreateAttendance2Dto) {
    try {
      const attendance = this.attendanceRepo.create({
        date: dto.date,
        status: dto.status,
        academicYear: dto.academicYear,
        semester: dto.semester,
        note: dto.note,
        recordedBy: dto.recordedBy,

        student: { id: dto.student_id } as any,
        school: { id: dto.school_id } as any,
        reason: dto.reason_id ? ({ id: dto.reason_id } as any) : null,
      });

      return await this.attendanceRepo.save(attendance);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const err: any = error;

        // 🔥 foreign key error
        if (err.code === '23503') {
          throw new BadRequestException(
            'student, school หรือ reason ไม่ถูกต้อง',
          );
        }

        // 🔥 unique (เผื่อมีในอนาคต)
        if (err.code === '23505') {
          throw new BadRequestException('ข้อมูลซ้ำ');
        }
      }

      // 🔥 fallback
      throw new InternalServerErrorException('ไม่สามารถบันทึก attendance ได้');
    }
  }

  //ค้นหาทั้งหมด
  async findAll() {
    return this.attendanceRepo.find({
      relations: ['student', 'school', 'reason'],
    });
  }

  //ค้นหาด้วยไอดี
  async findOne(id: number) {
    const attendance = await this.attendanceRepo.findOne({
      where: { id },
      relations: ['student', 'school', 'reason'],
    });

    if (!attendance) {
      throw new NotFoundException('ไม่พบข้อมูล attendance');
    }

    return attendance;
  }

  //อัพเดท
  async update(id: number, dto: UpdateAttendance2Dto) {
    try {
      const attendance = await this.findOne(id);

      // field ธรรมดา
      if (dto.date !== undefined) attendance.date = dto.date;
      if (dto.status !== undefined) attendance.status = dto.status;
      if (dto.academicYear !== undefined)
        attendance.academicYear = dto.academicYear;
      if (dto.semester !== undefined) attendance.semester = dto.semester;
      if (dto.note !== undefined) attendance.note = dto.note;
      if (dto.recordedBy !== undefined) attendance.recordedBy = dto.recordedBy;

      // relation
      if (dto.student_id !== undefined) {
        attendance.student = { id: dto.student_id } as any;
      }

      if (dto.school_id !== undefined) {
        attendance.school = { id: dto.school_id } as any;
      }

      if (dto.reason_id !== undefined) {
        attendance.reason = dto.reason_id
          ? ({ id: dto.reason_id } as any)
          : null;
      }

      return await this.attendanceRepo.save(attendance);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const err: any = error;

        if (err.code === '23503') {
          throw new BadRequestException(
            'student, school หรือ reason ไม่ถูกต้อง',
          );
        }
      }

      throw error;
    }
  }

  async remove(id: number) {
    const attendance = await this.findOne(id);
    return this.attendanceRepo.remove(attendance);
  }

  //bulk create
  async bulkCreate(dtos: CreateAttendance2Dto[]) {
    const records = dtos.map((dto) =>
      this.attendanceRepo.create({
        date: dto.date,
        status: dto.status,
        academicYear: dto.academicYear,
        semester: dto.semester,
        note: dto.note,
        recordedBy: dto.recordedBy,
        student: { id: dto.student_id } as any,
        school: { id: dto.school_id } as any,
        reason: dto.reason_id ? ({ id: dto.reason_id } as any) : null,
      }),
    );

    return this.attendanceRepo.save(records, { chunk: 500 });
  }

  private async getFilteredSchoolIds(
    province?: string,
    district?: string,
    subdistrict?: string,
    schoolId?: string,
  ): Promise<number[] | null> {
    if (schoolId) {
      const id = parseInt(schoolId);
      if (isNaN(id)) throw new BadRequestException('schoolId ต้องเป็นตัวเลข');

      const school = await this.schoolRepo.findOne({ where: { id } });
      if (!school) throw new NotFoundException(`ไม่พบโรงเรียน id ${schoolId}`);

      return [id];
    }
    if (!province && !district && !subdistrict) return null;

    const schools = await this.schoolRepo.find({ relations: ['town'] });

    const matched = schools.filter((s) => {
      if (!s.town) return false;
      if (province && s.town.CLS_PROVINCE !== province) return false;
      if (district && s.town.CLS_DISTRICT !== district) return false;
      if (subdistrict && s.town.CLS_SUBDISTRICT !== subdistrict) return false;
      return true;
    });

    if (matched.length === 0)
      throw new NotFoundException('ไม่พบโรงเรียนในพื้นที่ที่ระบุ');

    return matched.map((s) => s.id);
  }

  //เกี่ยวกับการดึงข้อมูลไปใช้ในหน้าที่เกี่ยวกับการรายงานผล
  async getSummary(
    academicYear: string,
    semester?: string,
    province?: string,
    district?: string,
    subdistrict?: string,
    schoolId?: string,
  ) {
    if (!/^[0-9]{4}$/.test(academicYear)) {
      throw new BadRequestException(
        'academicYear ต้องเป็นตัวเลข 4 หลัก เช่น 2567',
      );
    }
    if (semester && !/^[12]$/.test(semester)) {
      throw new BadRequestException('semester ต้องเป็น 1 หรือ 2 เท่านั้น');
    }

    const schoolIds = await this.getFilteredSchoolIds(
      province,
      district,
      subdistrict,
      schoolId,
    );

    const where: any = {
      status: AttendanceStatus.ABSENT,
      academicYear,
      ...(semester ? { semester } : {}),
      ...(schoolIds ? { school: In(schoolIds) } : {}),
    };

    if (semester) {
      where.semester = semester;
    }

    const records = await this.attendanceRepo.find({
      where,
      relations: ['student', 'reason', 'school', 'school.town'],
    });

    // ถ้าไม่มีข้อมูลเลยในปี/เทอมนั้น
    if (records.length === 0) {
      throw new NotFoundException(
        semester
          ? `ไม่พบข้อมูลปีการศึกษา ${academicYear} เทอม ${semester}`
          : `ไม่พบข้อมูลปีการศึกษา ${academicYear}`,
      );
    }

    const studentMap = new Map<
      number,
      { unexcused: number; excused: number }
    >();

    for (const rec of records) {
      const sid = rec.student.id;
      if (!studentMap.has(sid)) {
        studentMap.set(sid, { unexcused: 0, excused: 0 });
      }
      const entry = studentMap.get(sid)!;
      const category = rec.reason?.category;
      if (category === 'unexcused' || !category) {
        entry.unexcused++;
      } else {
        entry.excused++;
      }
    }

    let high = 0,
      medium = 0,
      watch = 0,
      normal = 0;
    for (const [, data] of studentMap) {
      const weighted = data.unexcused * 2 + data.excused * 0.5;
      if (weighted <= 1) normal++;
      else if (weighted < 3) watch++;
      else if (weighted < 5) medium++;
      else high++;
    }

    const totalStudents = semester
      ? await this.studentPerTermRepo.count({
          where: {
            academicYear,
            semester,
            ...(schoolIds ? { school: In(schoolIds) } : {}),
          },
        })
      : await this.studentPerTermRepo
          .createQueryBuilder('spt')
          .where('spt.academicYear = :academicYear', { academicYear })
          .andWhere(schoolIds ? 'spt.school_id IN (:...schoolIds)' : '1=1', {
            schoolIds: schoolIds ?? [],
          })
          .select('COUNT(DISTINCT spt.student_id)', 'count')
          .getRawOne()
          .then((r) => parseInt(r.count));

    //normal = totalStudents - high - medium - watch;
    // const weightedNormal = normal; // ขาดแต่ weighted = 0 (ถ้ามี) **เผื่อได้ใช้**

    return {
      academicYear,
      ...(semester ? { semester } : {}),
      high,
      medium,
      watch,
      normal,
      neverAbsent: Math.max(0, totalStudents - studentMap.size), // ไม่เคยขาดเลย
      total: totalStudents, //เด็กทั้งหมด
      totalRisk: high + medium, //เสี่ยงสูง + เสี่ยงกลาง
      totalRiskIncludeWatch: high + medium + watch, //เสี่ยงสูง + เสี่ยงกลาง + เฝ้าระวัง
    };
  }

  //สูตรคำนวณความเสี่ยง
  //ระดับความเสี่ยง = (จำนวนที่ขาดเรียนแบบไม่มีเหตุผล *  2) + (จำนวนที่ขาดเรียนแบบมีเหตุผล *  1)
  //weightedDays = (unexcusedDays × 2) + (excusedDays × 1)
  //0 = ปกติ , 1-2 = เฝ้าระวัง , 3-4 = เสี่ยงกลาง , >=5 = เสี่ยงสูง

  //ข้อมูลนักเรียนที่บอกความเสี่ยงตาม
  async getStudentRiskList(
    academicYear: string,
    semester?: string,
    riskLevel?: string,
    province?: string,
    district?: string,
    subdistrict?: string,
    schoolId?: string,
  ) {
    if (!/^[0-9]{4}$/.test(academicYear)) {
      throw new BadRequestException(
        'academicYear ต้องเป็นตัวเลข 4 หลัก เช่น 2567',
      );
    }
    if (semester && !/^[12]$/.test(semester)) {
      throw new BadRequestException('semester ต้องเป็น 1 หรือ 2 เท่านั้น');
    }
    const validLevels = ['high', 'medium', 'watch', 'normal'];
    if (riskLevel && !validLevels.includes(riskLevel)) {
      throw new BadRequestException(
        'riskLevel ต้องเป็น high, medium, watch หรือ normal เท่านั้น',
      );
    }

    const schoolIds = await this.getFilteredSchoolIds(
      province,
      district,
      subdistrict,
      schoolId,
    );

    const records = await this.attendanceRepo.find({
      where: {
        status: AttendanceStatus.ABSENT,
        academicYear,
        ...(semester ? { semester } : {}),
        ...(schoolIds ? { school: In(schoolIds) } : {}),
      },
      relations: ['student', 'reason', 'school', 'school.town'],
    });

    if (records.length === 0) {
      throw new NotFoundException(
        semester
          ? `ไม่พบข้อมูลปีการศึกษา ${academicYear} เทอม ${semester}`
          : `ไม่พบข้อมูลปีการศึกษา ${academicYear}`,
      );
    }

    const studentMap = new Map<
      number,
      {
        student: any;
        school: any;
        unexcused: number;
        excused: number;
        town: any;
      }
    >();

    for (const rec of records) {
      const sid = rec.student.id;
      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          student: rec.student,
          school: rec.school,
          town: rec.school?.town,
          unexcused: 0,
          excused: 0,
        });
      }
      const entry = studentMap.get(sid)!;
      const category = rec.reason?.category;
      if (category === 'unexcused' || !category) {
        entry.unexcused++;
      } else {
        entry.excused++;
      }
    }

    // ดึง StudentPerTerm ของปี/เทอมนั้น
    const studentPerTerms = await this.studentPerTermRepo.find({
      where: {
        academicYear,
        ...(semester ? { semester } : {}),
        ...(schoolIds ? { school: In(schoolIds) } : {}),
      },
      relations: ['student', 'gradeLevel', 'studentStatus', 'department'],
    });

    // map studentId → studentPerTerm
    const perTermMap = new Map<number, StudentPerTerm>();
    for (const spt of studentPerTerms) {
      const existing = perTermMap.get(spt.student.id);
      if (!existing || spt.semester > existing.semester) {
        perTermMap.set(spt.student.id, spt);
      }
    }

    const result: StudentRiskItem[] = [];
    for (const [studentId, data] of studentMap) {
      const weighted = data.unexcused * 2 + data.excused * 0.5;
      let riskLevel: string;
      if (weighted <= 1) riskLevel = 'normal';
      else if (weighted < 3) riskLevel = 'watch';
      else if (weighted < 5) riskLevel = 'medium';
      else riskLevel = 'high';

      const perTerm = perTermMap.get(studentId);

      result.push({
        studentId,
        firstName: data.student.firstName,
        lastName: data.student.lastName,
        schoolName: data.school?.name ?? null,
        province: data.town?.CLS_PROVINCE ?? null,
        district: data.town?.CLS_DISTRICT ?? null,
        subdistrict: data.town?.CLS_SUBDISTRICT ?? null,
        gradeLevel: perTerm?.gradeLevel?.name ?? null,
        department: perTerm?.department?.name ?? null,
        studentStatus: perTerm?.studentStatus?.name ?? null,
        gpax: perTerm?.gpax ?? null,
        unexcusedDays: data.unexcused,
        excusedDays: data.excused,
        totalAbsentDays: data.unexcused + data.excused,
        weightedDays: weighted,
        riskLevel,
      });
    }

    // เรียงจากเสี่ยงมากไปน้อย
    const order = ['high', 'medium', 'watch', 'normal'];
    const sorted = result.sort(
      (a, b) => order.indexOf(a.riskLevel) - order.indexOf(b.riskLevel),
    );
    return riskLevel ? sorted.filter((s) => s.riskLevel === riskLevel) : sorted;
  }

  //นักเรียนโดยแบ่งตามแต่ละความเสี่ยง
  async getStudentRiskGrouped(
    academicYear: string,
    semester?: string,
    province?: string,
    district?: string,
    subdistrict?: string,
    schoolId?: string,
  ) {
    const list = await this.getStudentRiskList(
      academicYear,
      semester,
      undefined,
      province,
      district,
      subdistrict,
      schoolId,
    );

    return {
      high: list.filter((s) => s.riskLevel === 'high'),
      medium: list.filter((s) => s.riskLevel === 'medium'),
      watch: list.filter((s) => s.riskLevel === 'watch'),
      normal: list.filter((s) => s.riskLevel === 'normal'),
    };
  }
}
