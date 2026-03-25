import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ReasonCategory {
  EXCUSED = 'excused', // ลาถูกต้อง เช่น ป่วย, ลากิจ
  UNEXCUSED = 'unexcused', // ขาดไม่มีเหตุ → นับเป็น risk
}

@Entity()
export class AttendanceReason {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar' })
  category: ReasonCategory;
}
