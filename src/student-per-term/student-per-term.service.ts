import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentPerTerm } from './entities/student-per-term.entity';
import { CreateStudentPerTermDto } from './dto/create-student-per-term.dto';
import { UpdateStudentPerTermDto } from './dto/update-student-per-term.dto';

@Injectable()
export class StudentPerTermService {
  constructor(
    @InjectRepository(StudentPerTerm)
    private readonly studentPerTermRepo: Repository<StudentPerTerm>,
  ) {}

  private get relations() {
    return ['student', 'school', 'gradeLevel', 'studentStatus', 'department'];
  }

  async create(dto: CreateStudentPerTermDto) {
    // เช็ค duplicate: student + academicYear + semester + school
    const existing = await this.studentPerTermRepo.findOne({
      where: {
        student: { id: dto.student_id },
        academicYear: dto.academicYear,
        semester: dto.semester,
        school: dto.school_id ? { id: dto.school_id } : undefined,
      },
    });

    if (existing) {
      throw new ConflictException(
        `นักเรียนนี้มีข้อมูลปีการศึกษา ${dto.academicYear} เทอม ${dto.semester} อยู่แล้ว`,
      );
    }

    const perTerm = this.studentPerTermRepo.create({
      student: { id: dto.student_id },
      school: dto.school_id ? { id: dto.school_id } : undefined,
      academicYear: dto.academicYear,
      semester: dto.semester,
      schoolAdmissionYear: dto.schoolAdmissionYear ?? undefined,
      gpax: dto.gpax ?? undefined,
      gradeLevel: dto.gradeLevel_id ? { id: dto.gradeLevel_id } : undefined,
      studentStatus: dto.studentStatus_id
        ? { id: dto.studentStatus_id }
        : undefined,
      department: dto.department_id ? { id: dto.department_id } : undefined,
    });

    const saved = await this.studentPerTermRepo.save(perTerm);
    return this.findOne(saved.id);
  }

  async findAll() {
    return this.studentPerTermRepo.find({
      relations: this.relations,
    });
  }

  // ดูทุก record ของนักเรียนคนเดียว
  async findByStudent(studentId: number) {
    return this.studentPerTermRepo.find({
      where: { student: { id: studentId } },
      relations: this.relations,
      order: { academicYear: 'DESC', semester: 'DESC' },
    });
  }

  async findOne(id: number) {
    const perTerm = await this.studentPerTermRepo.findOne({
      where: { id },
      relations: this.relations,
    });

    if (!perTerm) {
      throw new NotFoundException('ไม่พบข้อมูลนักเรียนรายเทอม');
    }

    return perTerm;
  }

  async update(id: number, dto: UpdateStudentPerTermDto) {
    const perTerm = await this.studentPerTermRepo.findOneBy({ id });

    if (!perTerm) {
      throw new NotFoundException('ไม่พบข้อมูลนักเรียนรายเทอม');
    }

    Object.assign(perTerm, {
      school: dto.school_id ? { id: dto.school_id } : perTerm.school,
      academicYear: dto.academicYear ?? perTerm.academicYear,
      semester: dto.semester ?? perTerm.semester,
      schoolAdmissionYear:
        dto.schoolAdmissionYear ?? perTerm.schoolAdmissionYear,
      gpax: dto.gpax ?? perTerm.gpax,
      gradeLevel: dto.gradeLevel_id
        ? { id: dto.gradeLevel_id }
        : perTerm.gradeLevel,
      studentStatus: dto.studentStatus_id
        ? { id: dto.studentStatus_id }
        : perTerm.studentStatus,
      department: dto.department_id
        ? { id: dto.department_id }
        : perTerm.department,
    } as any);

    await this.studentPerTermRepo.save(perTerm);
    return this.findOne(id);
  }

  async remove(id: number) {
    const perTerm = await this.studentPerTermRepo.findOneBy({ id });
    if (!perTerm) {
      throw new NotFoundException('ไม่พบข้อมูลนักเรียนรายเทอม');
    }
    return this.studentPerTermRepo.softDelete(id);
  }
}
