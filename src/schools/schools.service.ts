import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from './entities/school.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,
  ) {}

  async create(dto: CreateSchoolDto) {
    // เช็ค code ซ้ำก่อน
    const existing = await this.schoolRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `รหัสโรงเรียน "${dto.code}" มีอยู่ในระบบแล้ว`,
      );
    }

    const school = this.schoolRepo.create({
      code: dto.code,
      name: dto.name,
      schoolType: dto.schoolType_id ? { id: dto.schoolType_id } : undefined,
      department: dto.department_id ? { id: dto.department_id } : undefined,
      town: dto.town_id ? { id: dto.town_id } : undefined,
    });

    const saved = await this.schoolRepo.save(school);
    return this.findOne(saved.id);
  }

  async findAll() {
    return this.schoolRepo.find({
      relations: ['schoolType', 'department', 'town'],
    });
  }

  async findOne(id: number) {
    const school = await this.schoolRepo.findOne({
      where: { id },
      relations: ['schoolType', 'department', 'town'],
    });

    if (!school) {
      throw new NotFoundException('ไม่พบข้อมูลโรงเรียน');
    }

    return school;
  }

  async update(id: number, dto: UpdateSchoolDto) {
    const school = await this.schoolRepo.findOneBy({ id });

    if (!school) {
      throw new NotFoundException('ไม่พบข้อมูลโรงเรียน');
    }

    // ถ้าเปลี่ยน code ต้องเช็คซ้ำ
    if (dto.code && dto.code !== school.code) {
      const existing = await this.schoolRepo.findOne({
        where: { code: dto.code },
      });
      if (existing) {
        throw new ConflictException(
          `รหัสโรงเรียน "${dto.code}" มีอยู่ในระบบแล้ว`,
        );
      }
    }

    Object.assign(school, {
      code: dto.code ?? school.code,
      name: dto.name ?? school.name,
      schoolType: dto.schoolType_id
        ? { id: dto.schoolType_id }
        : school.schoolType,
      department: dto.department_id
        ? { id: dto.department_id }
        : school.department,
      town: dto.town_id ? { id: dto.town_id } : school.town,
    });

    await this.schoolRepo.save(school);
    return this.findOne(id);
  }

  async remove(id: number) {
    const school = await this.schoolRepo.findOneBy({ id });
    if (!school) {
      throw new NotFoundException('ไม่พบข้อมูลโรงเรียน');
    }
    return this.schoolRepo.softDelete(id);
  }
}
