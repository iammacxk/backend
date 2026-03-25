import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { ReasonCategory } from "../entities/attendance-category.enum";
import { ApiProperty } from "@nestjs/swagger";

export class CreateAttendanceReason2Dto {
    @ApiProperty({ description: 'รหัสเหตุผล (optional)', required: false })
    @IsString({ message: 'รหัสเหตุผล (code) ต้องเป็นตัวอักษรหรือข้อความ' })
    @IsNotEmpty({ message: 'กรุณาระบุรหัสเหตุผล (เช่น A01, B01)' })
    code: string;

    @ApiProperty({ description: 'รหัสเหตุผล (เช่น A01, B01)' })
    @IsString({ message: 'รายละเอียด (description) ต้องเป็นข้อความ' })
    @IsNotEmpty({ message: 'กรุณาระบุรายละเอียดของเหตุผล (เช่น ลาป่วย, ลากิจ)' })
    description: string;

    @ApiProperty({ description: 'หมวดหมู่เหตุผล', enum: Object.values(ReasonCategory) })
    @IsEnum(ReasonCategory, { message: 'หมวดหมู่ไม่ถูกต้อง (ต้องเป็น excused หรือ unexcused)' })
    @IsNotEmpty({ message: 'กรุณาระบุหมวดหมู่ (เช่น Excused, Unexcused)' })
    category: ReasonCategory;
}
