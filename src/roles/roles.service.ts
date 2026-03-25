import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RolesService {

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) { }

  //สร้างบทบาทใหม่
  async create(createRoleDto: CreateRoleDto) {
    const exist = await this.roleRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (exist) {
      throw new BadRequestException('Role already exists');
    }

    const role = this.roleRepository.create(createRoleDto);
    return this.roleRepository.save(role);
  }

  //หาหมด
  async findAll() {
    return this.roleRepository.find();
  }

  //หาตัวเดียว
  async findOne(id: number) {
    const role = await this.roleRepository.findOne({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  //อัพเดทบทบาท
  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = await this.findOne(id);

    Object.assign(role, updateRoleDto);
    return this.roleRepository.save(role);
  }

  //ลบบทบาท
  async remove(id: number) {
    const role = await this.findOne(id);
    return this.roleRepository.softRemove(role);
  }
}
