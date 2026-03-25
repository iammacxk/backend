import { AttendanceReason2 } from "src/attendance-reason2/entities/attendance-reason2.entity";
import { School } from "src/schools/entities/school.entity";
import { Student } from "src/students/entities/student.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AttendanceStatus } from "./attendance-status.enum";

@Entity('attendance2')
export class Attendance2 {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' }) 
  date: string;

  @Column()
  status: AttendanceStatus; //สถานะการเข้าเรียน

  @Column()
  academicYear: string; //ปีการศึกษา

  @Column() //เทอมการศึกษา
  semester: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ nullable: true })
  recordedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // --- Relations ---

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => School)
  @JoinColumn({ name: 'school_id' })
  school: School;

  @ManyToOne(() => AttendanceReason2, { nullable: true })
  @JoinColumn({ name: 'reason_id' })
  reason: AttendanceReason2;
}
