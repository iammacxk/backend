import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { StudentProfile } from './entities/student-profile.entity';
import { StudentGuardian } from './entities/student-guardian.entity';
import { OccupationGroup } from '../lookups/occupationGroup.entity';
import { EducationLevel } from '../lookups/educationLevel.entity';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { StudentProfileService } from './student-profile.service';
import { StudentProfileController } from './student-profile.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      StudentProfile,
      StudentGuardian,
      OccupationGroup,
      EducationLevel,
    ]),
  ],
  controllers: [StudentsController, StudentProfileController],
  providers: [StudentsService, StudentProfileService],
  exports: [StudentsService, StudentProfileService],
})
export class StudentsModule {}
