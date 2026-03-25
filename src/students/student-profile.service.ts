import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentProfile } from './entities/student-profile.entity';
import {
  StudentGuardian,
  GuardianType,
} from './entities/student-guardian.entity';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { UpsertStudentProfileDto } from './dto/upsert-student-profile.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';

@Injectable()
export class StudentProfileService {
  constructor(
    @InjectRepository(StudentProfile)
    private readonly profileRepo: Repository<StudentProfile>,
    @InjectRepository(StudentGuardian)
    private readonly guardianRepo: Repository<StudentGuardian>,
  ) {}

  // ========== PROFILE ==========

  async getProfile(studentId: number): Promise<StudentProfile | null> {
    return this.profileRepo.findOne({
      where: { student: { id: studentId } },
      relations: ['student'],
    });
  }

  async upsertProfile(
    studentId: number,
    dto: UpsertStudentProfileDto,
  ): Promise<StudentProfile> {
    let profile = await this.profileRepo.findOne({
      where: { student: { id: studentId } },
    });

    if (!profile) {
      profile = this.profileRepo.create({ student: { id: studentId } });
    }

    if (dto.weight !== undefined) profile.weight = dto.weight;
    if (dto.height !== undefined) profile.height = dto.height;
    if (dto.bloodType !== undefined) profile.bloodType = dto.bloodType;
    if (dto.congenitalDisease !== undefined)
      profile.congenitalDisease = dto.congenitalDisease;

    return this.profileRepo.save(profile);
  }

  // ========== GUARDIAN ==========

  async getGuardians(studentId: number): Promise<StudentGuardian[]> {
    return this.guardianRepo.find({
      where: { student: { id: studentId } },
      relations: ['occupation', 'educationLevel'],
      order: { guardianType: 'ASC' },
    });
  }

  async createGuardian(
    studentId: number,
    dto: CreateGuardianDto,
  ): Promise<StudentGuardian> {
    const guardian = this.guardianRepo.create({
      student: { id: studentId },
      guardianType: dto.guardianType,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      phone: dto.phone ?? null,
      parentStatus: (dto.parentStatus as any) ?? null,
      maritalStatus: (dto.maritalStatus as any) ?? null,
      occupation: dto.occupation_id ? ({ id: dto.occupation_id } as any) : null,
      educationLevel: dto.education_level_id
        ? ({ id: dto.education_level_id } as any)
        : null,
    });
    return this.guardianRepo.save(guardian);
  }

  async updateGuardian(
    id: number,
    dto: UpdateGuardianDto,
  ): Promise<StudentGuardian> {
    const guardian = await this.guardianRepo.findOne({ where: { id } });
    if (!guardian) throw new NotFoundException(`Guardian #${id} not found`);

    if (dto.firstName !== undefined) guardian.firstName = dto.firstName ?? null;
    if (dto.lastName !== undefined) guardian.lastName = dto.lastName ?? null;
    if (dto.phone !== undefined) guardian.phone = dto.phone ?? null;
    if (dto.parentStatus !== undefined)
      guardian.parentStatus = (dto.parentStatus as any) ?? null;
    if (dto.maritalStatus !== undefined)
      guardian.maritalStatus = (dto.maritalStatus as any) ?? null;
    if (dto.occupation_id !== undefined) {
      guardian.occupation = dto.occupation_id
        ? ({ id: dto.occupation_id } as any)
        : null;
    }
    if (dto.education_level_id !== undefined) {
      guardian.educationLevel = dto.education_level_id
        ? ({ id: dto.education_level_id } as any)
        : null;
    }

    return this.guardianRepo.save(guardian);
  }

  async removeGuardian(id: number): Promise<void> {
    const guardian = await this.guardianRepo.findOne({ where: { id } });
    if (!guardian) throw new NotFoundException(`Guardian #${id} not found`);
    await this.guardianRepo.remove(guardian);
  }
}
