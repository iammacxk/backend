import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('CLS_TOWN')
export class Town {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code_province' })
  code_province: string;

  @Column({ name: 'CLS_PROVINCE' })
  CLS_PROVINCE: string;

  @Column({ name: 'code_district' })
  code_district: string;

  @Column({ name: 'CLS_DISTRICT' })
  CLS_DISTRICT: string;

  @Column({ name: 'code_subdistrict' })
  code_subdistrict: string;

  @Column({ name: 'CLS_SUBDISTRICT' })
  CLS_SUBDISTRICT: string;
}
