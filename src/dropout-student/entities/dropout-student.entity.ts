import { GradeLevel } from 'src/lookups/gradeLevel.entity';
import { Town } from 'src/lookups/town.entity';
import { Student } from 'src/students/entities/student.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class DropoutStudent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  personId: string | null;

  // เชื่อมกับ student เดิมถ้า PersonID ตรงกัน
  // ถ้าไม่มี PersonID (PDPA) → null
  @ManyToOne(() => Student, { nullable: true })
  @JoinColumn({ name: 'student_id' })
  student: Student | null;

  // ที่อยู่ดึงจาก CLS_TOWN ผ่าน code_subdistrict
  // CLS_TOWN มี CLS_PROVINCE, CLS_DISTRICT, CLS_SUBDISTRICT อยู่แล้ว
  @ManyToOne(() => Town, { nullable: true })
  @JoinColumn({ name: 'town_id' })
  town: Town | null;

  @Column({ type: 'date', nullable: true })
  birthDate: Date | null;

  @ManyToOne(() => GradeLevel, { nullable: true })
  @JoinColumn({ name: 'gradeLevel_id' })
  gradeLevel: GradeLevel | null;

  @Column({ type: 'varchar' })
  academicYear: string; // ACADYEAR ปีการศึกษา

  @Column({ type: 'varchar', nullable: true })
  houseNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  villageNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  street: string | null;

  @Column({ type: 'varchar', nullable: true })
  soi: string | null;

  @Column({ type: 'varchar', nullable: true })
  trok: string | null;

  @Column({ type: 'varchar', nullable: true })
  schoolName: string | null;

  @Column({ type: 'varchar', nullable: true })
  academicYearPresent: string | null;

  @Column({ type: 'varchar', nullable: true })
  statusCodeCause: string | null;

  @Column({ type: 'varchar', nullable: true })
  dropoutTransferId: string | null;

  @Column({ type: 'varchar', nullable: true })
  remark: string | null;
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
