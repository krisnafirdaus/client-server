import { NestFactory } from '@nestjs/core';
import { ChatServiceModule } from './chat-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ChatServiceModule);

  // Enable CORS for the frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3002, '0.0.0.0');
}
void bootstrap();
