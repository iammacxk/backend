import { Department } from 'src/lookups/department.entity';
import { GradeLevel } from 'src/lookups/gradeLevel.entity';
import { StudentStatus } from 'src/lookups/studentStatus.entity';
import { School } from 'src/schools/entities/school.entity';
import { Student } from 'src/students/entities/student.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class StudentPerTerm {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student, { nullable: false })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => School, { nullable: true })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column()
  academicYear: string;

  @Column()
  semester: string;

  @Column({ nullable: true })
  schoolAdmissionYear: string;

  @Column({ nullable: true })
  gpax: string;

  @ManyToOne(() => GradeLevel, { nullable: true })
  @JoinColumn({ name: 'gradeLevel_id' })
  gradeLevel: GradeLevel;

  @ManyToOne(() => StudentStatus, { nullable: true })
  @JoinColumn({ name: 'studentStatus_id' })
  studentStatus: StudentStatus;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
