import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepeatGradeController } from './repeat-grade.controller';
import { RepeatGradeService } from './repeat-grade.service';
import { StudentPerTerm } from 'src/student-per-term/entities/student-per-term.entity';
import { Attendance2Module } from 'src/attendance2/attendance2.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentPerTerm]),
    Attendance2Module,
  ],
  controllers: [RepeatGradeController],
  providers: [RepeatGradeService],
  exports: [RepeatGradeService],
})
export class RepeatGradeModule {}
