import { Module } from '@nestjs/common';
import { WorkerServiceService } from './worker-service.service';
import { ChatProcessor } from './chat.processor';
import { DbModule } from '@app/db';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    DbModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'chat',
    }),
  ],
  controllers: [],
  providers: [WorkerServiceService, ChatProcessor],
})
export class WorkerServiceModule {}
