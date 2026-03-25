import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DropoutStudentService } from './dropout-student.service';
import { CreateDropoutStudentDto } from './dto/create-dropout-student.dto';
import { UpdateDropoutStudentDto } from './dto/update-dropout-student.dto';

@ApiTags('dropout-student')
@Controller('dropout-student')
export class DropoutStudentController {
  constructor(private readonly dropoutStudentService: DropoutStudentService) {}

  @Post()
  @ApiOperation({ summary: 'เพิ่มข้อมูลเด็กหลุดจากระบบ' })
  create(@Body() dto: CreateDropoutStudentDto) {
    return this.dropoutStudentService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'ดูข้อมูลเด็กหลุดจากระบบทั้งหมด' })
  findAll() {
    return this.dropoutStudentService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'ดูข้อมูลเด็กหลุดจากระบบตาม id' })
  findOne(@Param('id') id: string) {
    return this.dropoutStudentService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'แก้ไขข้อมูลเด็กหลุดจากระบบ' })
  update(@Param('id') id: string, @Body() dto: UpdateDropoutStudentDto) {
    return this.dropoutStudentService.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'ลบข้อมูลเด็กหลุดจากระบบ' })
  remove(@Param('id') id: string) {
    return this.dropoutStudentService.remove(+id);
  }
}
