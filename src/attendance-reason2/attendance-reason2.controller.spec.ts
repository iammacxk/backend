import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceReason2Controller } from './attendance-reason2.controller';
import { AttendanceReason2Service } from './attendance-reason2.service';

describe('AttendanceReason2Controller', () => {
  let controller: AttendanceReason2Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceReason2Controller],
      providers: [AttendanceReason2Service],
    }).compile();

    controller = module.get<AttendanceReason2Controller>(AttendanceReason2Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
