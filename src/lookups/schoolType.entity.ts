import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('CLS_SCHOOL_TYPE_NAME')
export class SchoolType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code' })
  code: string;

  @Column({ name: 'name' })
  name: string;
}
