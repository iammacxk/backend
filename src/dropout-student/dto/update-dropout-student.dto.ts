import { PartialType } from '@nestjs/swagger';
import { CreateDropoutStudentDto } from './create-dropout-student.dto';

export class UpdateDropoutStudentDto extends PartialType(CreateDropoutStudentDto) {}
