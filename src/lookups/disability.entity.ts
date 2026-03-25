import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('CLS_DISABILITY')
export class Disability {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code' })
  code: string;

  @Column({ name: 'name' })
  name: string;
}
