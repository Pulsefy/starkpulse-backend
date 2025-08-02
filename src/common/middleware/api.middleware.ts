import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction } from "express";
import { MonitoringService } from "src/monitoring/monitoring.service";
import { SlaService } from "src/usage-billing/sla.service";

@Injectable()
export class ApiMiddleware implements NestMiddleware {
  constructor(
    private gateway: ApiGatewayService,
    private monitoring: MonitoringService,
    private sla: SlaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    const user = await this.gateway.handleRequest(req);

    res.on('finish', async () => {
      const duration = Date.now() - start;
      await this.monitoring.logUsage(user, req.url, req.method, duration);
      this.sla.checkSlaViolations(duration, user.tier);
    });

    next();
  }
}