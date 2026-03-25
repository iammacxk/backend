import { Department } from 'src/lookups/department.entity';
import { SchoolType } from 'src/lookups/schoolType.entity';
import { Town } from 'src/lookups/town.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class School {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @ManyToOne(() => SchoolType, { eager: false })
  @JoinColumn({ name: 'schoolType_id' })
  schoolType: SchoolType;

  @ManyToOne(() => Department, { nullable: true, eager: false })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => Town, { nullable: true, eager: false })
  @JoinColumn({ name: 'town_id' })
  town: Town;

  @OneToMany(() => User, (user) => user.school)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
