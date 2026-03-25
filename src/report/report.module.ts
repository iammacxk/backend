import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../students/entities/student.entity';
import { DropoutStudent } from '../dropout-student/entities/dropout-student.entity';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [TypeOrmModule.forFeature([Student, DropoutStudent])],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
