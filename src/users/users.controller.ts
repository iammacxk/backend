import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam } from '@nestjs/swagger';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'สร้าง user' })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      example1: {
        summary: 'ตัวอย่าง',
        value: {
          username: 'Anutin007',
          password: '123456789',
          roleId: 1,
        },
      },
    },
  })
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Get()
  @ApiConsumes('application/x-www-form-urlencoded')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'ดึง user ตาม id' })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'user id',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'แก้ไข user' })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  @ApiBody({
    type: UpdateUserDto,
    examples: {
      example1: {
        value: {
          username: 'Anutin69',
          password: '1234567899',
          roleId: 2,
        },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
  ) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'ลบ user' })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
