import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DbService } from '@app/db';
import { Logger } from '@nestjs/common';

import { SendMessageInput } from '../../chat-service/src/chat.types';

@Processor('chat')
export class ChatProcessor extends WorkerHost {
  private readonly logger = new Logger(ChatProcessor.name);

  constructor(private db: DbService) {
    super();
  }

  async process(job: Job<SendMessageInput, any, string>): Promise<any> {
    if (job.name === 'sendMessage') {
      const input = job.data;

      try {
        // Case 4: Idempotency & Persistence
        await this.db.message.create({
          data: {
            content: input.content,
            senderId: input.senderId,
            roomId: input.roomId,
            attachmentUrl: input.attachmentUrl,
            attachmentType: input.attachmentType,
            idempotencyKey: input.idempotencyKey,
          },
        });
        this.logger.log(`[Worker] Message processed for room ${input.roomId}`);
      } catch (error: any) {
        // Case 4: Prevent duplicate message
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (error.code === 'P2002') {
          this.logger.log(
            `[Worker] Duplicate message detected (Idempotency Key: ${input.idempotencyKey})`,
          );
          return;
        }
        throw error; // Trigger retry (Case 4: Handle failure)
      }
    }
  }
}
