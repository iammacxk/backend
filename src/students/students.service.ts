import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import dayjs from 'dayjs';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
  ) {}

  async create(dto: CreateStudentDto) {
    // เช็ค personId ซ้ำก่อน
    const existing = await this.studentsRepository.findOne({
      where: { personId: dto.personId },
    });
    if (existing) {
      throw new ConflictException(
        `PersonID "${dto.personId}" มีอยู่ในระบบแล้ว`,
      );
    }

    const student = this.studentsRepository.create({
      personId: dto.personId,
      passportId: dto.passportId ?? undefined,
      firstName: dto.firstName,
      middleName: dto.middleName ?? undefined,
      lastName: dto.lastName,
      birthDate: dto.birthDate
        ? dayjs(dto.birthDate, 'YYYY-MM-DD', true).toDate()
        : null,
      villageNumber: dto.villageNumber ?? undefined,
      street: dto.street ?? undefined,
      soi: dto.soi ?? undefined,
      trok: dto.trok ?? undefined,

      prefix: dto.prefix_id ? { id: Number(dto.prefix_id) } : undefined,
      gender: dto.gender_id ? { id: Number(dto.gender_id) } : undefined,
      nationality: dto.nationality_id
        ? { id: Number(dto.nationality_id) }
        : undefined,
      disability: dto.disability_id
        ? { id: Number(dto.disability_id) }
        : undefined,
      disadvantage: dto.disadvantage_id
        ? { id: Number(dto.disadvantage_id) }
        : undefined,
      town: dto.town_id ? { id: Number(dto.town_id) } : undefined,
    });

    const saved = await this.studentsRepository.save(student);
    return this.findOne(saved.id);
  }

  async findAll() {
    return this.studentsRepository.find({
      relations: [
        'prefix',
        'gender',
        'nationality',
        'disability',
        'disadvantage',
        'town',
      ],
    });
  }

  async findOne(id: number) {
    const student = await this.studentsRepository.findOne({
      where: { id },
      relations: [
        'prefix',
        'gender',
        'nationality',
        'disability',
        'disadvantage',
        'town',
      ],
    });

    if (!student) {
      throw new NotFoundException('ไม่พบข้อมูลนักเรียน');
    }

    return student;
  }

  async update(id: number, dto: UpdateStudentDto) {
    const student = await this.studentsRepository.findOneBy({ id });

    if (!student) {
      throw new NotFoundException('ไม่พบข้อมูลนักเรียน');
    }

    // ถ้าเปลี่ยน personId ต้องเช็คซ้ำ
    if (dto.personId && dto.personId !== student.personId) {
      const existing = await this.studentsRepository.findOne({
        where: { personId: dto.personId },
      });
      if (existing) {
        throw new ConflictException(
          `PersonID "${dto.personId}" มีอยู่ในระบบแล้ว`,
        );
      }
    }

    Object.assign(student, {
      personId: dto.personId ?? student.personId,
      passportId: dto.passportId ?? student.passportId,
      firstName: dto.firstName ?? student.firstName,
      middleName: dto.middleName ?? student.middleName,
      lastName: dto.lastName ?? student.lastName,
      birthDate: dto.birthDate
        ? dayjs(dto.birthDate, 'YYYY-MM-DD', true).toDate()
        : student.birthDate,
      villageNumber: dto.villageNumber ?? student.villageNumber,
      street: dto.street ?? student.street,
      soi: dto.soi ?? student.soi,
      trok: dto.trok ?? student.trok,

      prefix: dto.prefix_id ? { id: Number(dto.prefix_id) } : student.prefix,
      gender: dto.gender_id ? { id: Number(dto.gender_id) } : student.gender,
      nationality: dto.nationality_id
        ? { id: Number(dto.nationality_id) }
        : student.nationality,
      disability: dto.disability_id
        ? { id: Number(dto.disability_id) }
        : student.disability,
      disadvantage: dto.disadvantage_id
        ? { id: Number(dto.disadvantage_id) }
        : student.disadvantage,
      town: dto.town_id ? { id: Number(dto.town_id) } : student.town,
    } as any);

    await this.studentsRepository.save(student);
    return this.findOne(id);
  }

  async remove(id: number) {
    const student = await this.studentsRepository.findOneBy({ id });
    if (!student) {
      throw new NotFoundException('ไม่พบข้อมูลนักเรียน');
    }
    return this.studentsRepository.softDelete(id);
  }
}
