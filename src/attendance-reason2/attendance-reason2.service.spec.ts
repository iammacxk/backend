import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceReason2Service } from './attendance-reason2.service';

describe('AttendanceReason2Service', () => {
  let service: AttendanceReason2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttendanceReason2Service],
    }).compile();

    service = module.get<AttendanceReason2Service>(AttendanceReason2Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
