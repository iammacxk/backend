import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('CLS_GRADE_LEVEL')
export class GradeLevel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code' })
  code: string;

  @Column({ name: 'name' })
  name: string;
}
