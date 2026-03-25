import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('CLS_OCCUPATIONGROUP')
export class OccupationGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code' })
  code: string;

  @Column({ name: 'name' })
  name: string;
}
