import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const webOrigin = config.get<string>("WEB_ORIGIN") ?? "http://localhost:3000";

  app.use(cookieParser());
  app.enableCors({
    origin: webOrigin,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(config.get<string>("API_PORT") ?? 3001);
  await app.listen(port);
}

void bootstrap();
