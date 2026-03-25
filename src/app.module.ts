import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StudentsModule } from './students/students.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './students/entities/student.entity';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ImportModule } from './import/import.module';
import { StudentPerTermModule } from './student-per-term/student-per-term.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { SchoolsModule } from './schools/schools.module';
import { DropoutStudentModule } from './dropout-student/dropout-student.module';
import { AuthModule } from './auth/auth.module';
import { ReportModule } from './report/report.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ReportDropOutStudentModule } from './report-drop-out-student/report-drop-out-student.module';
import { Attendance2Module } from './attendance2/attendance2.module';
import { AttendanceReason2Module } from './attendance-reason2/attendance-reason2.module';
import { RepeatGradeModule } from './repeat-grade/repeat-grade.module';
import { ExportModule } from './export/export.module';
import { ReportRepeatGradeModule } from './report-repeat-grade/report-repeat-grade.module';
import { CacheModule } from '@nestjs/cache-manager';
@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 300, // 5 นาที
      max: 500,
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'assets'),
      serveRoot: '/assets',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT || 5432),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      extra: {
        foreign_keys: 1, // เปิด FK enforcement
      },
    }),
    StudentsModule,
    ImportModule,
    StudentPerTermModule,
    UsersModule,
    RolesModule,
    SchoolsModule,
    DropoutStudentModule,
    AuthModule,
    ReportModule,
    AttendanceModule,
    ReportDropOutStudentModule,
    Attendance2Module,
    AttendanceReason2Module,
    RepeatGradeModule,
    ExportModule,
    ReportRepeatGradeModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
