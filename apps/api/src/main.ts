import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable cookie parsing for HTTP-only JWT cookies
  app.use(cookieParser());

  // Enable CORS - allow all origins for local network access
  // In development, allow all origins to support IP-based access
  const corsOrigin = process.env.CORS_ORIGIN;
  const isDev = process.env.NODE_ENV !== 'production';
  app.enableCors({
    origin: isDev ? true : (corsOrigin === '*' ? true : (corsOrigin ? corsOrigin.split(',').map(o => o.trim()) : true)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('WS-Flows API')
    .setDescription('Workflow orchestration platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('teams', 'Team management')
    .addTag('workflows', 'Workflow CRUD')
    .addTag('executions', 'Workflow executions')
    .addTag('credentials', 'Credential management')
    .addTag('webhooks', 'Webhook management')
    .addTag('nodes', 'Node registry')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);

  console.log(`🚀 WS-Flows API running on http://${host}:${port}`);
  console.log(`📚 Swagger docs available at http://${host}:${port}/docs`);
}

bootstrap();
