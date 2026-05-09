import "reflect-metadata";
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: ['http://localhost:12400', 'http://localhost:12403', 'http://127.0.0.1:12403'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', { exclude: ['/', 'uploads/(.*)'] });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Serve uploaded files
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  const port = process.env.PORT || 12404;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
