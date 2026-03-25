import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { AttendanceStatus } from "../entities/attendance-status.enum";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateAttendance2Dto {
    @ApiProperty({ description: 'วันที่เข้าเรียน (YYYY-MM-DD)' })
    @IsDateString({}, { message: 'รูปแบบวันที่ไม่ถูกต้อง (ควรเป็น YYYY-MM-DD)' })
    @IsNotEmpty({ message: 'กรุณาระบุวันที่' })
    date: string;

    @ApiProperty({ description: 'สถานะการเข้าเรียน', enum: ['present', 'absent'] })
    @IsNotEmpty({ message: 'กรุณาระบุสถานะการเข้าเรียน' })
    @IsEnum(AttendanceStatus, { message: 'สถานะไม่ถูกต้อง' })
    status: AttendanceStatus; // เช่น 'PRESENT', 'ABSENT'

    @ApiProperty({ description: 'ปีการศึกษา' })
    @IsString()
    @IsNotEmpty({ message: 'กรุณาระบุปีการศึกษา' })
    academicYear: string;

    @ApiProperty({ description: 'เทอม' })
    @IsString({ message: 'เทอมต้องเป็นตัวอักษร' })
    @IsNotEmpty({ message: 'กรุณาระบุเทอม' })
    semester: string;

    @ApiProperty({ description: 'หมายเหตุ', required: false })
    @IsString()
    @IsOptional()
    note?: string;

    @ApiProperty({ description: 'หมายเหตุ', required: false })
    @IsOptional()
    @IsString({ message: 'หมายเหตุต้องเป็นข้อความ' })
    recordedBy?: string;

    // --- ส่วนของ Foreign Keys ---

    @ApiProperty({ description: 'รหัสนักเรียน' })
    @IsInt({ message: 'student_id ต้องเป็นตัวเลขจำนวนเต็ม' })
    @IsNotEmpty({ message: 'กรุณาระบุรหัสนักเรียน' })
    @Type(() => Number)
    student_id: number;

    @ApiProperty({ description: 'รหัสโรงเรียน' })
    @IsInt({ message: 'school_id ต้องเป็นตัวเลขจำนวนเต็ม' })
    @IsNotEmpty({ message: 'กรุณาระบุรหัสโรงเรียน' })
    @Type(() => Number)
    school_id: number;

    @ApiProperty({ description: 'รหัสเหตุผล (optional)', required: false })
    @IsInt({ message: 'reason_id ต้องเป็นตัวเลขจำนวนเต็ม' })
    @Type(() => Number)
    @IsOptional()
    reason_id?: number;
}
