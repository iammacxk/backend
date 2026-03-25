import { Test, TestingModule } from '@nestjs/testing';
import { Attendance2Controller } from './attendance2.controller';
import { Attendance2Service } from './attendance2.service';

describe('Attendance2Controller', () => {
  let controller: Attendance2Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Attendance2Controller],
      providers: [Attendance2Service],
    }).compile();

    controller = module.get<Attendance2Controller>(Attendance2Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
