import { Test, TestingModule } from '@nestjs/testing';
import { StudentPerTermService } from './student-per-term.service';

describe('StudentPerTermService', () => {
  let service: StudentPerTermService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentPerTermService],
    }).compile();

    service = module.get<StudentPerTermService>(StudentPerTermService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
