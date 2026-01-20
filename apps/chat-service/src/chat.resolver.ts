import { Resolver, Mutation, Query, Args, Subscription } from '@nestjs/graphql';
import { ChatService } from './chat-service.service';
import { SendMessageInput, Message } from './chat.types';
import { Inject } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';

@Resolver(() => Message)
export class ChatResolver {
  constructor(
    private readonly chatService: ChatService,
    @Inject('PUB_SUB') private pubSub: RedisPubSub,
  ) {}

  @Mutation(() => Boolean)
  async sendMessage(@Args('input') input: SendMessageInput) {
    return this.chatService.sendMessage(input);
  }

  @Query(() => [Message])
  async messages(@Args('roomId') roomId: string) {
    return this.chatService.getMessages(roomId);
  }

  @Subscription(() => Message, {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    resolve: (payload: any) => payload.messageSent as Message,
  })
  messageSent(@Args('roomId') roomId: string) {
    return this.pubSub.asyncIterator(`room:${roomId}`);
  }
}
