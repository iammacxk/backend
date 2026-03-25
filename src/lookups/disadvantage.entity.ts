import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('CLS_DISADVANTAGE_EDUCATION')
export class Disadvantage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code' })
  code: string;

  @Column({ name: 'name' })
  name: string;
}
