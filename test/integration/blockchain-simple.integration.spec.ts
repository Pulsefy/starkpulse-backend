import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainService } from '../../src/blockchain/blockchain.service';
import { ContractService } from '../../src/blockchain/services/contract.service';

describe('Blockchain Integration Tests', () => {
  let blockchainService: BlockchainService;
  let contractService: ContractService;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      providers: [
        BlockchainService,
        {
          provide: ContractService,
          useValue: {
            callMethod: jest.fn(),
            getContract: jest.fn(),
          },
        },
      ],
    }).compile();

    blockchainService = moduleFixture.get<BlockchainService>(BlockchainService);
    contractService = moduleFixture.get<ContractService>(ContractService);
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Contract Method Calls', () => {
    it('should call contract methods successfully', async () => {
      const contractAddress =
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const abiName = 'ERC20';
      const method = 'balanceOf';
      const args = ['0x742d35Cc6634C0532925a3b8D3Ac65e'];

      const mockResult = '1000000000000000000'; // 1 ETH in wei

      jest.mocked(contractService.callMethod).mockResolvedValue(mockResult);

      const result = await blockchainService.callContractMethod(
        contractAddress,
        abiName,
        method,
        args,
      );

      expect(result).toBeDefined();
      expect(contractService.callMethod).toHaveBeenCalledWith(
        contractAddress,
        abiName,
        method,
        args,
      );
    });

    it('should handle contract call failures with retry', async () => {
      const contractAddress =
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const abiName = 'ERC20';
      const method = 'balanceOf';
      const args = ['0x742d35Cc6634C0532925a3b8D3Ac65e'];

      // First call fails, second succeeds
      jest
        .mocked(contractService.callMethod)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce('1000000000000000000');

      const result = await blockchainService.callContractMethod(
        contractAddress,
        abiName,
        method,
        args,
      );

      expect(result).toBeDefined();
      expect(contractService.callMethod).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple contract addresses', async () => {
      const contracts = [
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH
        '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', // STRK
      ];

      jest
        .mocked(contractService.callMethod)
        .mockResolvedValue('1000000000000000000');

      const promises = contracts.map((address) =>
        blockchainService.callContractMethod(
          address,
          'ERC20',
          'totalSupply',
          [],
        ),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(2);
      expect(contractService.callMethod).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const contractAddress =
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';

      jest
        .mocked(contractService.callMethod)
        .mockRejectedValue(new Error('Network connection failed'));

      await expect(
        blockchainService.callContractMethod(
          contractAddress,
          'ERC20',
          'balanceOf',
          ['0x123'],
        ),
      ).rejects.toThrow('Network connection failed');
    });

    it('should handle invalid contract addresses', async () => {
      jest
        .mocked(contractService.callMethod)
        .mockRejectedValue(new Error('Invalid contract address'));

      await expect(
        blockchainService.callContractMethod(
          'invalid-address',
          'ERC20',
          'balanceOf',
          ['0x123'],
        ),
      ).rejects.toThrow('Invalid contract address');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent contract calls efficiently', async () => {
      const contractAddress =
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';

      jest
        .mocked(contractService.callMethod)
        .mockResolvedValue('1000000000000000000');

      const promises = Array.from({ length: 10 }, (_, i) =>
        blockchainService.callContractMethod(
          contractAddress,
          'ERC20',
          'balanceOf',
          [`0x${i.toString().padStart(40, '0')}`],
        ),
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(2000); // Should handle efficiently
    });

    it('should cache contract instances for performance', async () => {
      const contractAddress =
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const mockContract = { call: jest.fn().mockResolvedValue('result') };

      jest
        .mocked(contractService.getContract)
        .mockResolvedValue(mockContract as any);

      // Make multiple calls to the same contract
      await blockchainService.callContractMethod(
        contractAddress,
        'ERC20',
        'name',
        [],
      );
      await blockchainService.callContractMethod(
        contractAddress,
        'ERC20',
        'symbol',
        [],
      );
      await blockchainService.callContractMethod(
        contractAddress,
        'ERC20',
        'decimals',
        [],
      );

      // getContract should be called only once due to caching
      expect(contractService.getContract).toHaveBeenCalledTimes(1);
    });
  });

  describe('CRUD Operations', () => {
    it('should create blockchain entry', () => {
      const createDto = { name: 'Test Blockchain', network: 'testnet' };
      const result = blockchainService.create(createDto);

      expect(result).toBe('This action adds a new blockchain');
    });

    it('should find all blockchain entries', () => {
      const result = blockchainService.findAll();

      expect(result).toBe('This action returns all blockchain');
    });

    it('should find one blockchain entry', () => {
      const id = 1;
      const result = blockchainService.findOne(id);

      expect(result).toBe('This action returns a #1 blockchain');
    });

    it('should update blockchain entry', () => {
      const id = 1;
      const updateDto = { name: 'Updated Blockchain' };
      const result = blockchainService.update(id, updateDto);

      expect(result).toBe('This action updates a #1 blockchain');
    });

    it('should remove blockchain entry', () => {
      const id = 1;
      const result = blockchainService.remove(id);

      expect(result).toBe('This action removes a #1 blockchain');
    });
  });
});
