import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module";
import { CalculationsModule } from "./calculations/calculations.module";
import { GradesModule } from "./grades/grades.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SubjectsModule } from "./subjects/subjects.module";
import { TermsModule } from "./terms/terms.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    CalculationsModule,
    AuthModule,
    SubjectsModule,
    TermsModule,
    GradesModule,
  ],
})
export class AppModule {}
