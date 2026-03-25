import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance2 } from '../attendance2/entities/attendance2.entity';
import { StudentPerTerm } from '../student-per-term/entities/student-per-term.entity';
import { Student } from '../students/entities/student.entity';
import { DropoutStudent } from '../dropout-student/entities/dropout-student.entity';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attendance2,
      StudentPerTerm,
      Student,
      DropoutStudent,
    ]),
  ],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
