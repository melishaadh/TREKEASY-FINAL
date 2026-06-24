import * as dotenv from 'dotenv';
import * as path from 'path';
import * as express from 'express';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cors from 'cors';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
console.log("Checking MONGODB_URI:", process.env.MONGODB_URI);
  app.use(cors({
    origin: '*', 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  app.use('/images', express.static(path.resolve(__dirname, '../../assets/images')));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.setGlobalPrefix('api');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;

  // Listen on all network interfaces
  await app.listen(port, '0.0.0.0');
  console.log(`TrekEasy Backend running on: http://0.0.0.0:${port}/api`);
} // <--- THIS BRACE IS REQUIRED

bootstrap(); // <--- THIS IS OUTSIDE THE FUNCTION