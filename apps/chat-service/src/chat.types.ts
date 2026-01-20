import { ObjectType, Field, ID, InputType } from '@nestjs/graphql';

@ObjectType()
export class Message {
  @Field(() => ID)
  id: string;

  @Field()
  content: string;

  @Field({ nullable: true })
  attachmentUrl?: string;

  @Field()
  senderId: string;

  @Field()
  roomId: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class Room {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field(() => [Message], { nullable: 'items' })
  messages: Message[];
}

@InputType()
export class SendMessageInput {
  @Field()
  roomId: string;

  @Field()
  senderId: string;

  @Field()
  content: string;

  @Field({ nullable: true })
  attachmentUrl?: string;

  @Field({ nullable: true })
  attachmentType?: string;

  @Field()
  idempotencyKey: string;
}
