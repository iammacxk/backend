import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('CLS_NATIONALITY')
export class Nationality {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code' })
  code: string;

  @Column({ name: 'name' })
  name: string;
}
