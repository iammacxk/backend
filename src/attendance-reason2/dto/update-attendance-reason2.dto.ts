import { PartialType } from '@nestjs/swagger';
import { CreateAttendanceReason2Dto } from './create-attendance-reason2.dto';

export class UpdateAttendanceReason2Dto extends PartialType(CreateAttendanceReason2Dto) {}
