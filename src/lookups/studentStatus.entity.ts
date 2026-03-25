import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('CLS_STUDENT_STATUS')
export class StudentStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code' })
  code: string;

  @Column({ name: 'name' })
  name: string;
}
