import { Module } from '@nestjs/common';
import { ChatService } from './chat-service.service';
import { ChatResolver } from './chat.resolver';
import { BullModule } from '@nestjs/bullmq';
import { DbModule } from '@app/db';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';

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
      name: 'chat', // Case 2: Publish to Queue
    }),
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      subscriptions: {
        'graphql-ws': true,
      },
    }),
  ],
  controllers: [],
  providers: [
    ChatService,
    ChatResolver,
    {
      provide: 'PUB_SUB',
      useValue: new RedisPubSub({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: 6379,
        },
      }),
    },
  ],
})
export class ChatServiceModule {}
