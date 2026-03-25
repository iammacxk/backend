import { Module } from '@nestjs/common';
import { Attendance2Service } from './attendance2.service';
import { Attendance2Controller } from './attendance2.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance2 } from './entities/attendance2.entity';
import { School } from 'src/schools/entities/school.entity';
import { Student } from 'src/students/entities/student.entity';
import { AttendanceReason2 } from 'src/attendance-reason2/entities/attendance-reason2.entity';
import { StudentPerTerm } from 'src/student-per-term/entities/student-per-term.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance2,Student,School,AttendanceReason2,StudentPerTerm])],
  controllers: [Attendance2Controller],
  providers: [Attendance2Service],
  exports: [Attendance2Service],
})
export class Attendance2Module { }
