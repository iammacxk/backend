import { Module } from '@nestjs/common';
import { AttendanceReason2Service } from './attendance-reason2.service';
import { AttendanceReason2Controller } from './attendance-reason2.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceReason2 } from './entities/attendance-reason2.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceReason2])],
  controllers: [AttendanceReason2Controller],
  providers: [AttendanceReason2Service],
  exports: [AttendanceReason2Service],
})
export class AttendanceReason2Module { }
