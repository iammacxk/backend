import { Module } from '@nestjs/common';

import { ReportRepeatGradeController } from './report-repeat-grade.controller';
import { ReportRepeatGradeService } from './report-repeat-grade.service';

import { RepeatGradeModule } from 'src/repeat-grade/repeat-grade.module';

@Module({
  imports: [
    RepeatGradeModule,
  ],
  controllers: [ReportRepeatGradeController],
  providers: [ReportRepeatGradeService],
})
export class ReportRepeatGradeModule {}