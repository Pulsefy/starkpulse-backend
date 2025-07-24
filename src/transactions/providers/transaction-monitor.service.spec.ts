// @ts-ignore: Cannot find module '@nestjs/testing' or its corresponding type declarations.
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionMonitorService } from './transaction-monitor.service';
import { ComplianceRuleEngineService } from './compliance-rule-engine.service';
import { SuspiciousActivityDetectionService } from './suspicious-activity-detection.service';
import { RegulatoryReportingService } from './regulatory-reporting.service';

describe('TransactionMonitorService', () => {
  let service: TransactionMonitorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionMonitorService,
        { provide: ComplianceRuleEngineService, useValue: { evaluate: jest.fn() } },
        { provide: SuspiciousActivityDetectionService, useValue: { detectAnomalies: jest.fn() } },
        { provide: RegulatoryReportingService, useValue: { generateCsvReport: jest.fn() } },
        // Add other required mocks as needed
        { provide: 'TransactionRepository', useValue: {} },
        { provide: 'TransactionEventRepository', useValue: {} },
        { provide: 'NotificationRepo', useValue: {} },
        { provide: 'ConfigService', useValue: {} },
        { provide: 'TransactionIndexService', useValue: {} },
        { provide: 'UsersService', useValue: {} },
      ],
    }).compile();

    service = module.get<TransactionMonitorService>(TransactionMonitorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
}); 