import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Student } from '../students/entities/student.entity';
import { StudentPerTerm } from '../student-per-term/entities/student-per-term.entity';
import { School } from '../schools/entities/school.entity';
import { DropoutStudent } from '../dropout-student/entities/dropout-student.entity';
import { LookupModule } from '../lookups/lookups.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ImportDropoutService } from './import-dropout.service';
import { ImportPreviewService } from './import-preview.service';
import { ErrorReportService } from './error-report.service';
import { ImportHistory } from './entities/import-history.entity';
import { ImportHistoryService } from './import-history.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Module({
  imports: [
    MulterModule.register(),
    TypeOrmModule.forFeature([
      Student,
      StudentPerTerm,
      School,
      DropoutStudent,
      ImportHistory,
    ]),
    LookupModule,
  ],
  controllers: [ImportController],
  providers: [
    ImportService,
    ImportDropoutService,
    ImportPreviewService,
    ImportHistoryService, // ← service ใหม่
    ErrorReportService,
    AuthGuard,
  ],
})
export class ImportModule {}
