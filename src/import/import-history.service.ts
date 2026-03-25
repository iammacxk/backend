import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { ImportHistory, ImportType } from './entities/import-history.entity';

export interface ErrorRow {
  row: number;
  personId?: string | null;
  reasons: string[];
}

interface RecordImportParams {
  userId?: number;
  userName?: string;
  fileName: string;
  importType: ImportType;
  totalRows: number;
  successCount: number;
  skippedCount: number;
  errorCount: number;
  status?: 'completed' | 'failed';
  errors?: ErrorRow[]; // error list สำหรับ download
  errorRawRows?: Record<string, any>[]; // raw rows ที่ error สำหรับ download ไฟล์ต้นฉบับ
}

@Injectable()
export class ImportHistoryService {
  constructor(
    @InjectRepository(ImportHistory)
    private readonly historyRepo: Repository<ImportHistory>,
  ) {}

  async record(params: RecordImportParams): Promise<ImportHistory> {
    const history = this.historyRepo.create({
      userId: params.userId ?? null,
      userName: params.userName ?? null,
      fileName: params.fileName,
      importType: params.importType,
      totalRows: params.totalRows,
      successCount: params.successCount,
      skippedCount: params.skippedCount,
      errorCount: params.errorCount,
      status: params.status ?? 'completed',
      // เก็บเป็น JSON string ใน DB
      errorsJson: params.errors?.length ? JSON.stringify(params.errors) : null,
      errorRawRowsJson: params.errorRawRows?.length
        ? JSON.stringify(params.errorRawRows)
        : null,
    });
    return this.historyRepo.save(history);
  }

  async findAll(): Promise<
    Omit<ImportHistory, 'errorsJson' | 'errorRawRowsJson'>[]
  > {
    // ไม่ส่ง json field ขนาดใหญ่ไปที่ list — ดึงเฉพาะตอน download
    return this.historyRepo.find({
      select: [
        'id',
        'userId',
        'userName',
        'fileName',
        'importType',
        'totalRows',
        'successCount',
        'skippedCount',
        'errorCount',
        'status',
        'importedAt',
      ],
      order: { importedAt: 'DESC' },
    });
  }

  // ---- Download error list → xlsx ----
  async downloadErrorList(id: number): Promise<Buffer> {
    const history = await this.historyRepo.findOne({ where: { id } });
    if (!history) throw new NotFoundException(`History #${id} ไม่พบ`);
    if (!history.errorsJson)
      throw new NotFoundException('ไม่มีข้อมูล error สำหรับ record นี้');

    const errors: ErrorRow[] = JSON.parse(history.errorsJson);

    const data = [
      ['Row', 'PersonID', 'สาเหตุ'],
      ...errors.map((e) => [e.row, e.personId ?? '-', e.reasons.join(', ')]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 80 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Error List');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // ---- Download raw file ที่เหลือแค่ error rows พร้อม column เดิม ----
  async downloadErrorRawFile(
    id: number,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const history = await this.historyRepo.findOne({ where: { id } });
    if (!history) throw new NotFoundException(`History #${id} ไม่พบ`);
    if (!history.errorRawRowsJson)
      throw new NotFoundException('ไม่มีข้อมูล raw rows สำหรับ record นี้');

    const rawRows: Record<string, any>[] = JSON.parse(history.errorRawRowsJson);

    const ws = XLSX.utils.json_to_sheet(rawRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Error Rows');

    // ชื่อไฟล์: error_<ชื่อไฟล์เดิม>
    const baseName = history.fileName.replace(/\.[^.]+$/, '');
    const fileName = `error_${baseName}.xlsx`;

    return {
      buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
      fileName,
    };
  }
}
