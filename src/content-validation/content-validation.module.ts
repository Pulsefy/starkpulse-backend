import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ConfigModule } from "@nestjs/config"
import { ScheduleModule } from "@nestjs/schedule"

// Entities
import { Validator } from "./entities/validator.entity"
import { ValidationTask } from "./entities/validation-task.entity"
import { ValidationResult } from "./entities/validation-result.entity"
import { ContentItem } from "./entities/content-item.entity"
import { ReputationScore } from "./entities/reputation-score.entity"
import { ValidationConsensus } from "./entities/validation-consensus.entity"
import { QualityMetric } from "./entities/quality-metric.entity"
import { BlockchainRecord } from "./entities/blockchain-record.entity"
import { ValidatorReward } from "./entities/validator-reward.entity"
import { ValidationHistory } from "./entities/validation-history.entity"

// Services
import { ValidatorService } from "./services/validator.service"
import { ValidationTaskService } from "./services/validation-task.service"
import { ValidationResultService } from "./services/validation-result.service"
import { ContentValidationService } from "./services/content-validation.service"
import { ReputationService } from "./services/reputation.service"
import { ConsensusService } from "./services/consensus.service"
import { QualityMetricsService } from "./services/quality-metrics.service"
import { BlockchainService } from "./services/blockchain.service"
import { RewardService } from "./services/reward.service"
import { NetworkService } from "./services/network.service"

// Controllers
import { ValidatorController } from "./controllers/validator.controller"
import { ValidationController } from "./controllers/validation.controller"
import { ReputationController } from "./controllers/reputation.controller"
import { QualityMetricsController } from "./controllers/quality-metrics.controller"
import { NetworkController } from "./controllers/network.controller"

// Gateways
import { ValidationGateway } from "./gateways/validation.gateway"

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Validator,
      ValidationTask,
      ValidationResult,
      ContentItem,
      ReputationScore,
      ValidationConsensus,
      QualityMetric,
      BlockchainRecord,
      ValidatorReward,
      ValidationHistory,
    ]),
  ],
  controllers: [
    ValidatorController,
    ValidationController,
    ReputationController,
    QualityMetricsController,
    NetworkController,
  ],
  providers: [
    ValidatorService,
    ValidationTaskService,
    ValidationResultService,
    ContentValidationService,
    ReputationService,
    ConsensusService,
    QualityMetricsService,
    BlockchainService,
    RewardService,
    NetworkService,
    ValidationGateway,
  ],
  exports: [ContentValidationService, ValidatorService, ReputationService, QualityMetricsService],
})
export class ContentValidationModule {}
