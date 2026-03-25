import { Test, TestingModule } from '@nestjs/testing';
import { StudentPerTermController } from './student-per-term.controller';
import { StudentPerTermService } from './student-per-term.service';

describe('StudentPerTermController', () => {
  let controller: StudentPerTermController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentPerTermController],
      providers: [StudentPerTermService],
    }).compile();

    controller = module.get<StudentPerTermController>(StudentPerTermController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
