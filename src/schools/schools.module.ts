import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from './entities/school.entity';
import { SchoolsService } from './schools.service';
import { SchoolsController } from './schools.controller';
import { LookupModule } from 'src/lookups/lookups.module';

@Module({
  imports: [TypeOrmModule.forFeature([School]), LookupModule],
  controllers: [SchoolsController],
  providers: [SchoolsService],
  exports: [TypeOrmModule],
})
export class SchoolsModule {}
