import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { SecurityEvent } from "../common/security/entities/security-event.entity"
import { ThreatIntelligence } from "../common/security/entities/threat-intelligence.entity"
import { SecurityIncident } from "../common/security/entities/security-incident.entity"
import { SiemService } from "./siem.service"
import { ThreatDetectionService } from "./threat-detection.service"
import { IncidentResponseService } from "./incident-response.service"
import { SecurityController } from "./security.controller"
import { AlertingService } from "../monitoring/alerting.service"

@Module({
  imports: [
    TypeOrmModule.forFeature([SecurityEvent, ThreatIntelligence, SecurityIncident]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [SecurityController],
  providers: [SiemService, ThreatDetectionService, IncidentResponseService, AlertingService],
  exports: [SiemService, ThreatDetectionService, IncidentResponseService],
})
export class SecurityModule {}
