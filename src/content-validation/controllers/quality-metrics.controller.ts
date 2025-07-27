import { Controller, Get, Post } from "@nestjs/common"
import type { QualityMetricsService } from "../services/quality-metrics.service"

@Controller("quality-metrics")
export class QualityMetricsController {
  constructor(private readonly qualityMetricsService: QualityMetricsService) {}

  @Get("content/:contentId")
  getContentQualityMetrics(contentId: string) {
    return this.qualityMetricsService.findByContentId(contentId)
  }

  @Post("content/:contentId/generate")
  generateQualityMetrics(contentId: string) {
    return this.qualityMetricsService.generateQualityMetrics(contentId)
  }
}
