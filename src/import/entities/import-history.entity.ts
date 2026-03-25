import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ImportType = 'students' | 'dropout';

@Entity('import_history')
export class ImportHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: true })
  userId: number | null; // user.id จาก JWT sub

  @Column({ type: 'varchar', nullable: true })
  userName: string | null; // user.name จาก JWT

  @Column({ type: 'varchar' })
  fileName: string; // file.originalname

  @Column()
  importType: ImportType; // 'students' | 'dropout'

  @Column({ type: 'integer', default: 0 })
  totalRows: number;

  @Column({ type: 'integer', default: 0 })
  successCount: number;

  @Column({ type: 'integer', default: 0 })
  skippedCount: number;

  @Column({ type: 'integer', default: 0 })
  errorCount: number;

  @Column({ default: 'completed' })
  status: 'completed' | 'failed';

  @Column({ type: 'text', nullable: true })
  errorsJson: string | null;

  @Column({ type: 'text', nullable: true })
  errorRawRowsJson: string | null;

  @CreateDateColumn()
  importedAt: Date;
}
