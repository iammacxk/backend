import { Department } from 'src/lookups/department.entity';
import { Disability } from 'src/lookups/disability.entity';
import { Disadvantage } from 'src/lookups/disadvantage.entity';
import { Gender } from 'src/lookups/gender.entity';
import { GradeLevel } from 'src/lookups/gradeLevel.entity';
import { Nationality } from 'src/lookups/nationality.entity';
import { Prefix } from 'src/lookups/prefix.entity';
import { StudentStatus } from 'src/lookups/studentStatus.entity';
import { Town } from 'src/lookups/town.entity';
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
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  personId: string;

  @Column({ nullable: true })
  passportId: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  middleName: string;

  @Column()
  lastName: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date | null;

  @Column({ nullable: true })
  villageNumber: string;

  @Column({ nullable: true })
  street: string;

  @Column({ nullable: true })
  soi: string;

  @Column({ nullable: true })
  trok: string;

  @ManyToOne(() => Prefix, { eager: false })
  @JoinColumn({ name: 'prefix_id' })
  prefix: Prefix;

  @ManyToOne(() => Gender, { eager: false })
  @JoinColumn({ name: 'gender_id' })
  gender: Gender;

  @ManyToOne(() => Nationality, { eager: false })
  @JoinColumn({ name: 'nationality_id' })
  nationality: Nationality;

  @ManyToOne(() => Disability, { eager: false })
  @JoinColumn({ name: 'disability_id' })
  disability: Disability;

  @ManyToOne(() => Disadvantage, { eager: false })
  @JoinColumn({ name: 'disadvantage_id' })
  disadvantage: Disadvantage;

  @ManyToOne(() => Town, { eager: false })
  @JoinColumn({ name: 'town_id' })
  town: Town;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
