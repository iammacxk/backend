import { PartialType } from '@nestjs/swagger';
import { CreateStudentPerTermDto } from './create-student-per-term.dto';

export class UpdateStudentPerTermDto extends PartialType(CreateStudentPerTermDto) {}
