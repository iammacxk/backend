import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DropoutStudent } from './entities/dropout-student.entity';
import { CreateDropoutStudentDto } from './dto/create-dropout-student.dto';
import { UpdateDropoutStudentDto } from './dto/update-dropout-student.dto';
import dayjs from 'dayjs';
@Injectable()
export class DropoutStudentService {
  constructor(
    @InjectRepository(DropoutStudent)
    private readonly dropoutRepo: Repository<DropoutStudent>,
  ) {}

  private get relations() {
    return ['student', 'town', 'gradeLevel'];
  }

  async create(dto: CreateDropoutStudentDto) {
    const dropout = this.dropoutRepo.create({
      student: dto.student_id ? { id: dto.student_id } : undefined,
      town: dto.town_id ? { id: dto.town_id } : undefined,
      gradeLevel: dto.gradeLevel_id ? { id: dto.gradeLevel_id } : undefined,
      birthDate: dto.birthDate
        ? dayjs(dto.birthDate, 'YYYY-MM-DD', true).toDate()
        : null,
      houseNumber: dto.houseNumber ?? undefined,
      villageNumber: dto.villageNumber ?? undefined,
      street: dto.street ?? undefined,
      soi: dto.soi ?? undefined,
      trok: dto.trok ?? undefined,
      schoolName: dto.schoolName ?? undefined,
      academicYearPresent: dto.academicYearPresent ?? undefined,
      academicYear: dto.academicYear,
      statusCodeCause: dto.statusCodeCause ?? undefined,
      dropoutTransferId: dto.dropoutTransferId ?? undefined,
      remark: dto.remark ?? undefined,
    });

    const saved = await this.dropoutRepo.save(dropout);
    return this.findOne(saved.id);
  }

  async findAll() {
    return this.dropoutRepo.find({ relations: this.relations });
  }

  async findOne(id: number) {
    const dropout = await this.dropoutRepo.findOne({
      where: { id },
      relations: this.relations,
    });
    if (!dropout) throw new NotFoundException('ไม่พบข้อมูลเด็กหลุดจากระบบ');
    return dropout;
  }

  async update(id: number, dto: UpdateDropoutStudentDto) {
    const dropout = await this.dropoutRepo.findOneBy({ id });
    if (!dropout) throw new NotFoundException('ไม่พบข้อมูลเด็กหลุดจากระบบ');

    Object.assign(dropout, {
      student: dto.student_id ? { id: dto.student_id } : dropout.student,
      town: dto.town_id ? { id: dto.town_id } : dropout.town,
      gradeLevel: dto.gradeLevel_id
        ? { id: dto.gradeLevel_id }
        : dropout.gradeLevel,
      birthDate: dto.birthDate
        ? dayjs(dto.birthDate, 'YYYY-MM-DD', true).toDate()
        : dropout.birthDate,
      houseNumber: dto.houseNumber ?? dropout.houseNumber,
      villageNumber: dto.villageNumber ?? dropout.villageNumber,
      street: dto.street ?? dropout.street,
      soi: dto.soi ?? dropout.soi,
      trok: dto.trok ?? dropout.trok,
      schoolName: dto.schoolName ?? dropout.schoolName,
      academicYearPresent:
        dto.academicYearPresent ?? dropout.academicYearPresent,
      academicYear: dto.academicYear ?? dropout.academicYear,
      statusCodeCause: dto.statusCodeCause ?? dropout.statusCodeCause,
      dropoutTransferId: dto.dropoutTransferId ?? dropout.dropoutTransferId,
      remark: dto.remark ?? dropout.remark,
    } as any);

    await this.dropoutRepo.save(dropout);
    return this.findOne(id);
  }

  async remove(id: number) {
    const dropout = await this.dropoutRepo.findOneBy({ id });
    if (!dropout) throw new NotFoundException('ไม่พบข้อมูลเด็กหลุดจากระบบ');
    return this.dropoutRepo.softDelete(id);
  }
}
