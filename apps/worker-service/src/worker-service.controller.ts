import { Controller } from '@nestjs/common';
import { WorkerServiceService } from './worker-service.service';

@Controller()
export class WorkerServiceController {
  constructor(private readonly workerServiceService: WorkerServiceService) {}
}
