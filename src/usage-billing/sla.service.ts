import { Injectable } from "@nestjs/common";

@Injectable()
export class SlaService {
  checkSlaViolations(responseTime: number, tier: string) {
    const sla = {
      free: 2000,
      pro: 1000,
      enterprise: 500,
    };
    if (responseTime > sla[tier]) {
      console.log('sla validated ')
    }
  }
}