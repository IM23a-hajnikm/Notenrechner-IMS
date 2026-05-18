import { Module } from "@nestjs/common";

import { CalculationsController } from "./calculations.controller";

@Module({
  controllers: [CalculationsController],
})
export class CalculationsModule {}
