import "reflect-metadata";
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security headers
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 429, message: '请求过于频繁，请稍后再试' },
  }));

  // CORS
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:12400', 'http://localhost:12403', 'http://127.0.0.1:12403'];
  app.enableCors({ origin: allowedOrigins, credentials: true });

  app.setGlobalPrefix('api/v1', { exclude: ['/', 'uploads/(.*)'] });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Serve uploaded files
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.useStaticAssets(join(process.cwd(), 'public'));
  // SPA fallback: serve index.html for non-API routes
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/') && !req.path.startsWith('/assets/')) {
      res.sendFile(join(process.cwd(), 'public', 'index.html'));
    } else {
      next();
    }
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 12404;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
