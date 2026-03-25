import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('CLS_EDUCATION_LEVEL')
export class EducationLevel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code' })
  code: string;

  @Column({ name: 'name' })
  name: string;
}
