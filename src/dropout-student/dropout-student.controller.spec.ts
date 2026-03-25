import { Test, TestingModule } from '@nestjs/testing';
import { DropoutStudentController } from './dropout-student.controller';
import { DropoutStudentService } from './dropout-student.service';

describe('DropoutStudentController', () => {
  let controller: DropoutStudentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DropoutStudentController],
      providers: [DropoutStudentService],
    }).compile();

    controller = module.get<DropoutStudentController>(DropoutStudentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
