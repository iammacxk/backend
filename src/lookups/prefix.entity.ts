import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('CLS_PREFIX')
export class Prefix {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code' })
  code: string;

  @Column({ name: 'name' })
  name: string;
}
