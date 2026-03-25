import { Attendance2 } from "src/attendance2/entities/attendance2.entity";
import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ReasonCategory } from "./attendance-category.enum";

@Entity('attendance_reason2')
export class AttendanceReason2 {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Index({ unique: true })
    code: string;

    @Column({ type: 'text' })
    description: string;

    @Column()
    category: ReasonCategory;

    @OneToMany(() => Attendance2, (attendance2) => attendance2.reason)
    attendances: Attendance2[];

}
