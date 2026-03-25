import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { School } from 'src/schools/entities/school.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Role)
    private roleRepository: Repository<Role>,

    @InjectRepository(School)
    private schoolRepository: Repository<School>,
  ) {}

  //เพิ่มผู้ใช้
  async create(createUserDto: CreateUserDto) {
    const { username, name, password, roleId, schoolId } = createUserDto;

    const exist = await this.userRepository.findOne({
      where: { username },
    });

    if (exist) {
      throw new BadRequestException('Username already exists');
    }

    const role = await this.roleRepository.findOne({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // 🔥 เพิ่ม school
    let school: School | null = null;
    if (schoolId) {
      school = await this.schoolRepository.findOne({
        where: { id: schoolId },
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      username,
      name,
      password: hashedPassword,
      role,
      school, // 👈 เพิ่มตรงนี้
    });

    return this.userRepository.save(user);
  }

  //เรียกดูทั้งหมด
  async findAll() {
    return this.userRepository.find({
      relations: ['role', 'school'], // 👈 join role
    });
  }

  //เรียกดูตามไอดี
  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'school'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findOneByLogin(username: string): Promise<User> {
    const user = await this.userRepository.findOneOrFail({
      where: { username },
      select: ['id', 'username', 'password'],
      relations: ['role', 'school'],
    });
    return user;
  }
  //อัพเดท
  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);

    if (updateUserDto.username) {
      const exist = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });

      if (exist && exist.id !== id) {
        throw new BadRequestException('Username already exists');
      }

      user.username = updateUserDto.username;
      user.name = updateUserDto.name;
    }

    if (updateUserDto.password) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.roleId) {
      const role = await this.roleRepository.findOne({
        where: { id: updateUserDto.roleId },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      user.role = role;
    }

    if (updateUserDto.schoolId !== undefined) {
      if (updateUserDto.schoolId === 0 || updateUserDto.schoolId === null) {
        //  เคลียร์ school
        user.school = null;
      } else {
        const school = await this.schoolRepository.findOne({
          where: { id: updateUserDto.schoolId },
        });

        if (!school) {
          throw new NotFoundException('School not found');
        }

        user.school = school;
      }
    }

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new BadRequestException('Username already exists');
      }
      throw error;
    }
  }

  //ลบผู้ใช้
  async remove(id: number) {
    const user = await this.findOne(id);
    return this.userRepository.softRemove(user);
  }
}
