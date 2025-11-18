import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import helmet from 'helmet';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_APP_URL?.split(',') || '*',
    credentials: true
  });
  if (process.env.ENABLE_CSRF === 'true') {
    app.use(
      csurf({
        cookie: {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        }
      })
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    })
  );

  const config = new DocumentBuilder()
    .setTitle('Minhas Vendas SaaS')
    .setDescription('API para o gerenciamento de vendas, despesas e clientes')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3333;
  await app.listen(port);
  console.log(`🚀 Backend is running on http://localhost:${port}`);
}

bootstrap();