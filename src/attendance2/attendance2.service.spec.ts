import { Test, TestingModule } from '@nestjs/testing';
import { Attendance2Service } from './attendance2.service';

describe('Attendance2Service', () => {
  let service: Attendance2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Attendance2Service],
    }).compile();

    service = module.get<Attendance2Service>(Attendance2Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
