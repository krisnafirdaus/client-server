import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose } from '@apollo/gateway';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      server: {
        // cors handled by main.ts
      },
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            {
              name: 'auth',
              url:
                process.env.AUTH_SERVICE_URL || 'http://localhost:3001/graphql',
            },
            {
              name: 'chat',
              url:
                process.env.CHAT_SERVICE_URL || 'http://localhost:3002/graphql',
            },
          ],
        }),
      },
    }),
  ],
})
export class GatewayModule {}
