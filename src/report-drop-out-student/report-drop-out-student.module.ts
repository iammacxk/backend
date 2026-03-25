// report-drop-out-student.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportDropOutStudentService } from './report-drop-out-student.service';
import { ReportDropOutStudentController } from './report-drop-out-student.controller';
import { StudentPerTerm } from '../student-per-term/entities/student-per-term.entity';
import { Student } from '../students/entities/student.entity';
import { Disadvantage } from '../lookups/disadvantage.entity';
import { DropoutStudent } from '../dropout-student/entities/dropout-student.entity';
import { School } from '../schools/entities/school.entity';
import { Town } from '../lookups/town.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentPerTerm,
      Student,
      Disadvantage,
      DropoutStudent,
      School,
      Town,
    ]),
  ],
  controllers: [ReportDropOutStudentController],
  providers: [ReportDropOutStudentService],
})
export class ReportDropOutStudentModule {}
