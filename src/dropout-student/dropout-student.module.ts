import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DropoutStudent } from './entities/dropout-student.entity';
import { DropoutStudentService } from './dropout-student.service';
import { DropoutStudentController } from './dropout-student.controller';
import { LookupModule } from 'src/lookups/lookups.module';

@Module({
  imports: [TypeOrmModule.forFeature([DropoutStudent]), LookupModule],
  controllers: [DropoutStudentController],
  providers: [DropoutStudentService],
  exports: [TypeOrmModule],
})
export class DropoutStudentModule {}
