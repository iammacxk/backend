import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from './student.entity';

@Entity()
export class StudentProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'float', nullable: true })
  weight: number | null;

  @Column({ type: 'float', nullable: true })
  height: number | null;

  @Column({ type: 'varchar', nullable: true })
  bloodType: string | null;

  @Column({ type: 'varchar', nullable: true })
  congenitalDisease: string | null;

  @CreateDateColumn()
  createAt: Date;

  @UpdateDateColumn()
  updateAt: Date;
}
