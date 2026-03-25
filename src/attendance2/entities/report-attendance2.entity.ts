export interface StudentRiskItem {
  studentId: number;
  firstName: string | null;
  lastName: string | null;
  schoolName: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  gradeLevel: string | null;
  department: string | null;
  studentStatus: string | null;
  gpax: string | null;
  unexcusedDays: number;
  excusedDays: number;
  totalAbsentDays: number;
  weightedDays: number;
  riskLevel: string;
}
