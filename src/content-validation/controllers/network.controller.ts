import { Controller, Get } from "@nestjs/common"
import type { NetworkService } from "../services/network.service"

@Controller("network")
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get("status")
  getNetworkStatus() {
    return this.networkService.getNetworkStatus()
  }

  @Get("metrics")
  getNetworkMetrics() {
    return this.networkService.getNetworkMetrics()
  }
}
