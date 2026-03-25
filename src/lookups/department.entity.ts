import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('CLS_DEPARTMENT')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code' })
  code: string;

  @Column({ name: 'name' })
  name: string;
}
