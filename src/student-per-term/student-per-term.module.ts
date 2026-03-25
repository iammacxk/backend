import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentPerTerm } from './entities/student-per-term.entity';
import { StudentPerTermService } from './student-per-term.service';
import { StudentPerTermController } from './student-per-term.controller';
import { LookupModule } from 'src/lookups/lookups.module';

@Module({
  imports: [TypeOrmModule.forFeature([StudentPerTerm]), LookupModule],
  controllers: [StudentPerTermController],
  providers: [StudentPerTermService],
  exports: [TypeOrmModule],
})
export class StudentPerTermModule {}
