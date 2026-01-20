import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DbService } from '@app/db';
import { SendMessageInput } from './chat.types';
import { RedisPubSub } from 'graphql-redis-subscriptions';

@Injectable()
export class ChatService {
  constructor(
    @InjectQueue('chat') private chatQueue: Queue,
    private db: DbService,
    @Inject('PUB_SUB') private pubSub: RedisPubSub,
  ) {}

  async sendMessage(input: SendMessageInput) {
    // Optimistic payload
    const optimisticMessage = {
      ...input,
      id: 'temp-' + Date.now(),
      createdAt: new Date(),
    };

    // Real-time publish (Case 2: Receive message with notification)
    await this.pubSub.publish(`room:${input.roomId}`, {
      messageSent: optimisticMessage,
    });

    // Queue for persistence (Case 2: API triggers Queue)
    await this.chatQueue.add('sendMessage', input, {
      attempts: 5, // Case 4: Handle retry & failure
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      jobId: input.idempotencyKey, // Case 4: Prevent duplicate message
    });

    return true;
  }

  async getMessages(roomId: string) {
    return this.db.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
