import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prefix } from './prefix.entity';
import { Gender } from './gender.entity';
import { Department } from './department.entity';
import { GradeLevel } from './gradeLevel.entity';
import { Disadvantage } from './disadvantage.entity';
import { Disability } from './disability.entity';
import { StudentStatus } from './studentStatus.entity';
import { Town } from './town.entity';
import { Nationality } from './nationality.entity';
import { SchoolType } from './schoolType.entity';
import { OccupationGroup } from './occupationGroup.entity';
import { EducationLevel } from './educationLevel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Prefix,
      Gender,
      Department,
      GradeLevel,
      Disadvantage,
      Disability,
      StudentStatus,
      Town,
      Nationality,
      SchoolType,
      OccupationGroup,
      EducationLevel,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class LookupModule {}
