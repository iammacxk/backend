import { EducationLevel } from 'src/lookups/educationLevel.entity';
import { OccupationGroup } from 'src/lookups/occupationGroup.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from './student.entity';

export enum GuardianType {
  FATHER = 'father',
  MOTHER = 'mother',
  GUARDIAN = 'guardian',
}

export enum ParentStatus {
  ALIVE = 'alive',
  DECEASED = 'deceased',
  UNKNOWN = 'unknown',
}

export enum MaritalStatus {
  MARRIED = 'married',
  DIVORCED = 'divorced',
  SEPARATED = 'separated',
  WIDOWED = 'widowed',
  UNKNOWN = 'unknown',
}

@Entity()
export class StudentGuardian {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'varchar' })
  guardianType: GuardianType;

  @Column({ type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  parentStatus: ParentStatus | null;

  @Column({ type: 'varchar', nullable: true })
  maritalStatus: MaritalStatus | null;

  @ManyToOne(() => OccupationGroup, { nullable: true })
  @JoinColumn({ name: 'occupation_id' })
  occupation: OccupationGroup | null;

  @ManyToOne(() => EducationLevel, { nullable: true })
  @JoinColumn({ name: 'education_level_id' })
  educationLevel: EducationLevel | null;

  @CreateDateColumn()
  createAt: Date;

  @UpdateDateColumn()
  updateAt: Date;
}
