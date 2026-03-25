import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  
  @Post()
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'สร้าง role' })
  @ApiBody({ type: CreateRoleDto })
  create(@Body() body: CreateRoleDto) {
    return this.rolesService.create(body);
  }

  @Get()
  @ApiConsumes('application/x-www-form-urlencoded')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @ApiConsumes('application/x-www-form-urlencoded')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(Number(id));
  }

  @Patch(':id')
  @ApiConsumes('application/x-www-form-urlencoded')
  update(@Param('id') id: string, @Body() body: UpdateRoleDto) {
    return this.rolesService.update(Number(id), body);
  }

  @Delete(':id')
  @ApiConsumes('application/x-www-form-urlencoded')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(Number(id));
  }
}
