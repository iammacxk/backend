import { PartialType } from '@nestjs/swagger';
import { CreateAttendance2Dto } from './create-attendance2.dto';

export class UpdateAttendance2Dto extends PartialType(CreateAttendance2Dto) {}
