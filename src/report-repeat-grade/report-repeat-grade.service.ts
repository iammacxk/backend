import { Injectable } from '@nestjs/common';
import { RepeatGradeService } from 'src/repeat-grade/repeat-grade.service';

@Injectable()
export class ReportRepeatGradeService {
  constructor(private readonly repeatService: RepeatGradeService) {}

  // summary สำหรับ dashboard
  async calculateRepeatGrade(query: {
    academicYear?: string;
    semester?: string;
  }) {
    const { academicYear, semester } = query;

    //ดึงจาก repeat service
    const list = await this.repeatService.findAllRepeatedStudents();

    //filter ตาม query
    const filtered = list.filter((item) => {
      if (academicYear && item.academicYear !== academicYear) return false;
      if (semester && item.semester !== semester) return false;
      return true;
    });

    let poorGpa = 0;
    let attendanceOverThreshold = 0;
    let transferOrPersonal = 0;
    let unknown = 0;

    for (const item of filtered) {
      switch (item.reason) {
        case 'poor_gpa':
          poorGpa++;
          break;
        case 'attendance':
          attendanceOverThreshold++;
          break;
        case 'transfer':
          transferOrPersonal++;
          break;
        default:
          unknown++;
      }
    }

    return {
      totalRepeated: filtered.length,
      poorGpa,
      attendanceOverThreshold,
      transferOrPersonal,
      unknown,
      repeatedList: filtered,
    };
  }

  async getTrend(year: string) {
    const prev = (Number(year) - 1).toString();

    const current = await this.calculateRepeatGrade({ academicYear: year });
    const previous = await this.calculateRepeatGrade({ academicYear: prev });

    return [
      { year: prev, repeated: previous.totalRepeated },
      { year, repeated: current.totalRepeated },
    ];
  }

  async getComparison(year: string) {
    const prev = (Number(year) - 1).toString();

    const current = await this.calculateRepeatGrade({ academicYear: year });
    const previous = await this.calculateRepeatGrade({ academicYear: prev });

    const diff = current.totalRepeated - previous.totalRepeated;

    return {
      current: current.totalRepeated,
      previous: previous.totalRepeated,
      diff,
      trend: diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'same',
    };
  }

  async getTopSchools(query: { academicYear?: string; semester?: string }) {
    const data = await this.calculateRepeatGrade(query);

    const map = new Map<number, any>();

    for (const item of data.repeatedList) {
      if (!item.schoolId) continue;

      if (!map.has(item.schoolId)) {
        map.set(item.schoolId, {
          schoolId: item.schoolId,
          schoolName: item.schoolName,
          total: 0,
        });
      }

      map.get(item.schoolId).total++;
    }

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // top 10
  }
}
