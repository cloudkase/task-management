import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  await app.listen(process.env.PORT ? parseInt(process.env.PORT, 10) : 3333);
  console.log('API listening on http://localhost:3333');
}
bootstrap();
