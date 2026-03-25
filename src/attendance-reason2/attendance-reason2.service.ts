import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateAttendanceReason2Dto } from './dto/create-attendance-reason2.dto';
import { UpdateAttendanceReason2Dto } from './dto/update-attendance-reason2.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { AttendanceReason2 } from './entities/attendance-reason2.entity';

@Injectable()
export class AttendanceReason2Service {

  constructor(
    @InjectRepository(AttendanceReason2)
    private reasonRepo: Repository<AttendanceReason2>,
  ) { }

  //////เพิ่มเหตุล
  async create(dto: CreateAttendanceReason2Dto) {
    try {
      // normalize code
      dto.code = dto.code.toUpperCase();

      const reason = this.reasonRepo.create(dto);
      return await this.reasonRepo.save(reason);

    } catch (error) {
      if (error instanceof QueryFailedError) {
        const err: any = error;

        if (err.code === '23505') {
          throw new BadRequestException('code นี้มีอยู่แล้ว');
        }
      }

      throw new InternalServerErrorException('ไม่สามารถสร้าง reason ได้');
    }
  }

  //ค้าหาทั้งหมด
  async findAll() {
    return this.reasonRepo.find();
  }

  //ค้นหาด้วยไอดี
  async findOne(id: number) {
    const reason = await this.reasonRepo.findOne({ where: { id } });

    if (!reason) {
      throw new NotFoundException('ไม่พบข้อมูลเหตุผล');
    }

    return reason;
  }

  //อัพเดทข้อมูล
  async update(id: number, dto: UpdateAttendanceReason2Dto) {
    try {
      const reason = await this.findOne(id);

      if (dto.code !== undefined) {
        dto.code = dto.code.toUpperCase();

        const duplicate = await this.reasonRepo.findOne({
          where: { code: dto.code },
        });

        if (duplicate && duplicate.id !== id) {
          throw new BadRequestException('code นี้มีอยู่แล้ว');
        }

        reason.code = dto.code;
      }

      if (dto.description !== undefined) {
        reason.description = dto.description;
      }

      if (dto.category !== undefined) {
        reason.category = dto.category;
      }

      return await this.reasonRepo.save(reason);

    } catch (error) {
      if (error instanceof QueryFailedError) {
        const err: any = error;

        if (err.code === '23505') {
          throw new BadRequestException('code นี้มีอยู่แล้ว');
        }
      }

      throw error;
    }
  }

  //ลบข้อมูล
  async remove(id: number) {
    const reason = await this.findOne(id);
    return this.reasonRepo.remove(reason);
  }
}
