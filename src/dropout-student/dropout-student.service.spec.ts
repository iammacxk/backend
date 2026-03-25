import { Test, TestingModule } from '@nestjs/testing';
import { DropoutStudentService } from './dropout-student.service';

describe('DropoutStudentService', () => {
  let service: DropoutStudentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DropoutStudentService],
    }).compile();

    service = module.get<DropoutStudentService>(DropoutStudentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
