import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class ErrorReportService {
  generateErrorReport(errors: any[]): Buffer {
    const data = [
      ['Row', 'PersonID', 'สาเหตุ'],
      ...errors.map((e) => [
        e.row,
        e.personId ?? '-',
        Array.isArray(e.reasons) ? e.reasons.join(', ') : (e.reason ?? '-'),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 60 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Errors');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
