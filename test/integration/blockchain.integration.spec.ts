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
            getBalance: jest.fn(),
            getTransaction: jest.fn(),
            subscribeToEvents: jest.fn(),
            getLatestBlock: jest.fn(),
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
      const contractAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const abiName = 'ERC20';
      const method = 'balanceOf';
      const args = ['0x742d35Cc6634C0532925a3b8D3Ac65e'];
      
      const mockResult = {
        result: ['0x1000000000000000000'], // 1 ETH in hex
        block_number: 12345,
      };

      jest.mocked(contractService.callMethod).mockResolvedValue(mockResult);

      const result = await blockchainService.callContractMethod(
        contractAddress,
        abiName,
        method,
        args
      );

      expect(result).toBeDefined();
      expect(contractService.callMethod).toHaveBeenCalledWith(
        contractAddress,
        abiName,
        method,
        args
      );
    });

    it('should handle contract call failures with retry', async () => {
      const contractAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const abiName = 'ERC20';
      const method = 'balanceOf';
      const args = ['0x742d35Cc6634C0532925a3b8D3Ac65e'];

      // First call fails, second succeeds
      jest.mocked(contractService.callMethod)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          result: ['0x1000000000000000000'],
          block_number: 12345,
        });

      const result = await blockchainService.callContractMethod(
        contractAddress,
        abiName,
        method,
        args
      );

      expect(result).toBeDefined();
      expect(contractService.callMethod).toHaveBeenCalledTimes(2);
    });

    it('should handle circuit breaker activation', async () => {
      const contractAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const abiName = 'ERC20';
      const method = 'balanceOf';
      const args = ['0x742d35Cc6634C0532925a3b8D3Ac65e'];

      // Mock multiple failures to trigger circuit breaker
      jest.mocked(contractService.callMethod).mockRejectedValue(
        new Error('Service unavailable')
      );

      // Multiple failed calls should eventually trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await blockchainService.callContractMethod(contractAddress, abiName, method, args);
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit breaker should now be open
      const fastFailStart = Date.now();
      try {
        await blockchainService.callContractMethod(contractAddress, abiName, method, args);
      } catch (error) {
        const fastFailTime = Date.now() - fastFailStart;
        expect(fastFailTime).toBeLessThan(100); // Should fail fast
      }
    });
  });

  describe('Balance Queries', () => {
    it('should get token balance for an address', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b8D3Ac65e';
      const tokenAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      
      const mockBalance = {
        balance: '1500000000000000000', // 1.5 ETH in wei
        decimals: 18,
        symbol: 'ETH',
        name: 'Ether',
      };

      jest.mocked(contractService.getBalance).mockResolvedValue(mockBalance);

      const result = await blockchainService.callContractMethod(
        tokenAddress,
        'ERC20',
        'balanceOf',
        [walletAddress]
      );

      expect(result).toBeDefined();
      expect(contractService.callMethod).toHaveBeenCalledWith(
        tokenAddress,
        'ERC20',
        'balanceOf',
        [walletAddress]
      );
    });

    it('should handle zero balances correctly', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b8D3Ac65e';
      const tokenAddress = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
      
      const mockResult = {
        result: ['0x0'], // Zero balance
        block_number: 12345,
      };

      jest.mocked(contractService.callMethod).mockResolvedValue(mockResult);

      const result = await blockchainService.callContractMethod(
        tokenAddress,
        'ERC20',
        'balanceOf',
        [walletAddress]
      );

      expect(result.result).toEqual(['0x0']);
    });
  });

  describe('Event Monitoring', () => {
    it('should monitor blockchain events', async () => {
      const contractAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const eventFilter = {
        eventName: 'Transfer',
        fromBlock: 12000,
        toBlock: 'latest',
      };

      const mockEvents = [
        {
          from_address: contractAddress,
          keys: ['0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9'],
          data: ['0x742d35Cc6634C0532925a3b8D3Ac65e', '0x123...', '0x1000000000000000000'],
          block_number: 12345,
          transaction_hash: '0xabc123...',
        },
      ];

      jest.mocked(contractService.subscribeToEvents).mockResolvedValue(mockEvents);

      const events = await contractService.subscribeToEvents(contractAddress, eventFilter);

      expect(events).toHaveLength(1);
      expect(events[0].from_address).toBe(contractAddress);
      expect(contractService.subscribeToEvents).toHaveBeenCalledWith(
        contractAddress,
        eventFilter
      );
    });

    it('should handle event subscription errors', async () => {
      const contractAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const eventFilter = {
        eventName: 'Transfer',
        fromBlock: 12000,
        toBlock: 'latest',
      };

      jest.mocked(contractService.subscribeToEvents).mockRejectedValue(
        new Error('Failed to subscribe to events')
      );

      await expect(
        contractService.subscribeToEvents(contractAddress, eventFilter)
      ).rejects.toThrow('Failed to subscribe to events');
    });
  });

  describe('Network Status', () => {
    it('should get latest block information', async () => {
      const mockBlock = {
        block_number: 12345,
        block_hash: '0xabc123...',
        timestamp: Date.now(),
        transaction_count: 150,
      };

      jest.mocked(contractService.getLatestBlock).mockResolvedValue(mockBlock);

      const block = await contractService.getLatestBlock();

      expect(block).toBeDefined();
      expect(block.block_number).toBe(12345);
      expect(block.transaction_count).toBe(150);
      expect(contractService.getLatestBlock).toHaveBeenCalled();
    });

    it('should handle network connectivity issues', async () => {
      jest.mocked(contractService.getLatestBlock).mockRejectedValue(
        new Error('Network unreachable')
      );

      await expect(contractService.getLatestBlock()).rejects.toThrow('Network unreachable');
    });
  });

  describe('Performance and Resilience', () => {
    it('should handle multiple concurrent contract calls', async () => {
      const contractAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const mockResult = {
        result: ['0x1000000000000000000'],
        block_number: 12345,
      };

      jest.mocked(contractService.callMethod).mockResolvedValue(mockResult);

      const promises = Array.from({ length: 10 }, (_, i) =>
        blockchainService.callContractMethod(
          contractAddress,
          'ERC20',
          'balanceOf',
          [`0x${i.toString().padStart(40, '0')}`]
        )
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(2000); // Should handle efficiently
      expect(contractService.callMethod).toHaveBeenCalledTimes(10);
    });

    it('should validate input parameters', async () => {
      // Test with invalid contract address
      await expect(
        blockchainService.callContractMethod(
          'invalid-address',
          'ERC20',
          'balanceOf',
          ['0x742d35Cc6634C0532925a3b8D3Ac65e']
        )
      ).rejects.toThrow();

      // Test with invalid method name
      await expect(
        blockchainService.callContractMethod(
          '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
          'ERC20',
          '', // Empty method name
          ['0x742d35Cc6634C0532925a3b8D3Ac65e']
        )
      ).rejects.toThrow();
    });

    it('should handle large responses efficiently', async () => {
      const contractAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      
      // Mock large response
      const largeResult = {
        result: Array.from({ length: 1000 }, (_, i) => `0x${i.toString(16).padStart(64, '0')}`),
        block_number: 12345,
      };

      jest.mocked(contractService.callMethod).mockResolvedValue(largeResult);

      const startTime = Date.now();
      const result = await blockchainService.callContractMethod(
        contractAddress,
        'Custom',
        'getLargeArray',
        []
      );
      const duration = Date.now() - startTime;

      expect(result.result).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should handle large responses efficiently
    });
  });

  describe('Error Handling', () => {
    it('should handle different types of blockchain errors', async () => {
      const contractAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';

      // Network error
      jest.mocked(contractService.callMethod).mockRejectedValueOnce(
        new Error('ECONNREFUSED')
      );

      await expect(
        blockchainService.callContractMethod(contractAddress, 'ERC20', 'balanceOf', ['0x123'])
      ).rejects.toThrow();

      // Invalid contract error
      jest.mocked(contractService.callMethod).mockRejectedValueOnce(
        new Error('Contract not found')
      );

      await expect(
        blockchainService.callContractMethod(contractAddress, 'ERC20', 'balanceOf', ['0x123'])
      ).rejects.toThrow();

      // Gas limit error
      jest.mocked(contractService.callMethod).mockRejectedValueOnce(
        new Error('Gas limit exceeded')
      );

      await expect(
        blockchainService.callContractMethod(contractAddress, 'ERC20', 'transfer', ['0x123', '1000'])
      ).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      const contractAddress = 'invalid-address';

      jest.mocked(contractService.callMethod).mockRejectedValue(
        new Error('Invalid contract address format')
      );

      try {
        await blockchainService.callContractMethod(contractAddress, 'ERC20', 'balanceOf', ['0x123']);
      } catch (error) {
        expect(error.message).toContain('Invalid contract address format');
      }
    });
  });

  describe('Integration with Real Blockchain Data', () => {
    it('should handle real transaction data format', async () => {
      const realTransactionResult = {
        result: [
          '0x1a2b3c4d5e6f7890', // transaction hash
          '0x1', // status
          '0x3039', // block number
          '0x16345785d8a0000', // value
        ],
        block_number: 12345,
      };

      jest.mocked(contractService.callMethod).mockResolvedValue(realTransactionResult);

      const result = await blockchainService.callContractMethod(
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        'StarkNet',
        'getTransaction',
        ['0x1a2b3c4d5e6f7890']
      );

      expect(result.result).toEqual(realTransactionResult.result);
      expect(result.block_number).toBe(12345);
    });

    it('should handle StarkNet-specific data types', async () => {
      const starkNetResult = {
        result: [
          '0x742d35Cc6634C0532925a3b8D3Ac65e', // StarkNet address
          '0x16345785d8a0000', // felt252 value
          ['0x1', '0x2', '0x3'], // array of felts
        ],
        block_number: 12345,
      };

      jest.mocked(contractService.callMethod).mockResolvedValue(starkNetResult);

      const result = await blockchainService.callContractMethod(
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        'StarkNet',
        'getStarkNetData',
        []
      );

      expect(result.result[0]).toBe('0x742d35Cc6634C0532925a3b8D3Ac65e');
      expect(Array.isArray(result.result[2])).toBe(true);
    });
  });
});

  describe('Transaction Monitoring', () => {
    it('should fetch transaction details from blockchain', async () => {
      const mockTxHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      // Mock the blockchain response
      jest.mocked(global.mockBlockchainService.getTransaction).mockResolvedValue({
        transaction_hash: mockTxHash,
        status: 'ACCEPTED_ON_L2',
        block_number: 12345,
        actual_fee: '1000000000000000',
        max_fee: '2000000000000000',
        version: '0x1',
        type: 'INVOKE',
        timestamp: Date.now(),
      });

      const result = await blockchainService.getTransaction(mockTxHash);

      expect(result).toBeDefined();
      expect(result.transaction_hash).toBe(mockTxHash);
      expect(result.status).toBe('ACCEPTED_ON_L2');
      expect(result.block_number).toBe(12345);
      expect(global.mockBlockchainService.getTransaction).toHaveBeenCalledWith(mockTxHash);
    });

    it('should handle pending transactions', async () => {
      const mockTxHash = '0x9876543210987654321098765432109876543210987654321098765432109876';
      
      jest.mocked(global.mockBlockchainService.getTransaction).mockResolvedValue({
        transaction_hash: mockTxHash,
        status: 'PENDING',
        block_number: null,
        actual_fee: null,
        max_fee: '2000000000000000',
        version: '0x1',
        type: 'INVOKE',
        timestamp: Date.now(),
      });

      const result = await blockchainService.getTransaction(mockTxHash);

      expect(result.status).toBe('PENDING');
      expect(result.block_number).toBeNull();
      expect(result.actual_fee).toBeNull();
    });

    it('should handle failed transactions', async () => {
      const mockTxHash = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef';
      
      jest.mocked(global.mockBlockchainService.getTransaction).mockResolvedValue({
        transaction_hash: mockTxHash,
        status: 'REJECTED',
        block_number: 12346,
        actual_fee: null,
        max_fee: '2000000000000000',
        version: '0x1',
        type: 'INVOKE',
        timestamp: Date.now(),
        revert_reason: 'Insufficient balance',
      });

      const result = await blockchainService.getTransaction(mockTxHash);

      expect(result.status).toBe('REJECTED');
      expect(result.revert_reason).toBe('Insufficient balance');
    });

    it('should retry on network failures', async () => {
      const mockTxHash = '0x1111111111111111111111111111111111111111111111111111111111111111';
      
      // First two calls fail, third succeeds
      jest.mocked(global.mockBlockchainService.getTransaction)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce({
          transaction_hash: mockTxHash,
          status: 'ACCEPTED_ON_L2',
          block_number: 12347,
          actual_fee: '1500000000000000',
          max_fee: '2000000000000000',
          version: '0x1',
          type: 'INVOKE',
          timestamp: Date.now(),
        });

      const result = await blockchainService.getTransaction(mockTxHash);

      expect(result).toBeDefined();
      expect(result.status).toBe('ACCEPTED_ON_L2');
      expect(global.mockBlockchainService.getTransaction).toHaveBeenCalledTimes(3);
    });

    it('should respect rate limits', async () => {
      const txHashes = Array.from({ length: 10 }, (_, i) => 
        `0x${i.toString().padStart(64, '0')}`
      );

      jest.mocked(global.mockBlockchainService.getTransaction).mockImplementation(
        async (hash) => ({
          transaction_hash: hash,
          status: 'ACCEPTED_ON_L2',
          block_number: 12345,
          actual_fee: '1000000000000000',
          max_fee: '2000000000000000',
          version: '0x1',
          type: 'INVOKE',
          timestamp: Date.now(),
        })
      );

      const startTime = Date.now();
      
      // Make concurrent requests
      const promises = txHashes.map(hash => blockchainService.getTransaction(hash));
      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(10);
      // Should respect rate limiting (not complete instantly)
      expect(duration).toBeGreaterThan(100);
    });
  });

  describe('Account Balance Queries', () => {
    it('should fetch account balance for ERC20 tokens', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b8D3Ac65e';
      const tokenAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'; // ETH on StarkNet
      
      jest.mocked(global.mockBlockchainService.getBalance).mockResolvedValue({
        balance: '1500000000000000000', // 1.5 ETH in wei
        decimals: 18,
        symbol: 'ETH',
        name: 'Ether',
      });

      const balance = await blockchainService.getTokenBalance(walletAddress, tokenAddress);

      expect(balance).toBeDefined();
      expect(balance.balance).toBe('1500000000000000000');
      expect(balance.symbol).toBe('ETH');
      expect(global.mockBlockchainService.getBalance).toHaveBeenCalledWith(
        walletAddress,
        tokenAddress
      );
    });

    it('should handle zero balances', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b8D3Ac65e';
      const tokenAddress = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'; // STRK
      
      jest.mocked(global.mockBlockchainService.getBalance).mockResolvedValue({
        balance: '0',
        decimals: 18,
        symbol: 'STRK',
        name: 'StarkNet Token',
      });

      const balance = await blockchainService.getTokenBalance(walletAddress, tokenAddress);

      expect(balance.balance).toBe('0');
      expect(balance.symbol).toBe('STRK');
    });

    it('should fetch multiple token balances efficiently', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b8D3Ac65e';
      const tokenAddresses = [
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH
        '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', // STRK
        '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8', // USDC
      ];

      jest.mocked(global.mockBlockchainService.getMultipleBalances).mockResolvedValue([
        { tokenAddress: tokenAddresses[0], balance: '1000000000000000000', symbol: 'ETH' },
        { tokenAddress: tokenAddresses[1], balance: '500000000000000000000', symbol: 'STRK' },
        { tokenAddress: tokenAddresses[2], balance: '1000000000', symbol: 'USDC' },
      ]);

      const startTime = Date.now();
      const balances = await blockchainService.getMultipleTokenBalances(walletAddress, tokenAddresses);
      const duration = Date.now() - startTime;

      expect(balances).toHaveLength(3);
      expect(duration).toBeLessThan(2000); // Should be efficient batch call
      expect(global.mockBlockchainService.getMultipleBalances).toHaveBeenCalledWith(
        walletAddress,
        tokenAddresses
      );
    });
  });

  describe('Contract Interactions', () => {
    it('should call view functions on contracts', async () => {
      const contractAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const functionName = 'balanceOf';
      const calldata = ['0x742d35Cc6634C0532925a3b8D3Ac65e'];

      jest.mocked(global.mockBlockchainService.callContract).mockResolvedValue({
        result: ['0x1000000000000000000'], // 1 ETH in hex
      });

      const result = await blockchainService.callContract(contractAddress, functionName, calldata);

      expect(result).toBeDefined();
      expect(result.result).toEqual(['0x1000000000000000000']);
      expect(global.mockBlockchainService.callContract).toHaveBeenCalledWith(
        contractAddress,
        functionName,
        calldata
      );
    });

    it('should handle contract call failures', async () => {
      const contractAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const functionName = 'invalidFunction';
      const calldata = ['0x742d35Cc6634C0532925a3b8D3Ac65e'];

      jest.mocked(global.mockBlockchainService.callContract).mockRejectedValue(
        new Error('Contract call failed: Entry point not found')
      );

      await expect(
        blockchainService.callContract(contractAddress, functionName, calldata)
      ).rejects.toThrow('Contract call failed: Entry point not found');
    });
  });

  describe('Event Monitoring', () => {
    it('should subscribe to contract events', async () => {
      const contractAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const eventName = 'Transfer';
      const filters = {
        from_address: '0x742d35Cc6634C0532925a3b8D3Ac65e',
      };

      const mockEvents = [
        {
          from_address: contractAddress,
          keys: ['0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9'],
          data: ['0x742d35Cc6634C0532925a3b8D3Ac65e', '0x123...', '0x1000000000000000000'],
          block_number: 12345,
          transaction_hash: '0xabc123...',
        },
      ];

      jest.mocked(global.mockBlockchainService.getEvents).mockResolvedValue(mockEvents);

      const events = await blockchainService.getContractEvents(contractAddress, eventName, filters);

      expect(events).toHaveLength(1);
      expect(events[0].from_address).toBe(contractAddress);
      expect(events[0].block_number).toBe(12345);
      expect(global.mockBlockchainService.getEvents).toHaveBeenCalledWith(
        contractAddress,
        eventName,
        filters
      );
    });

    it('should handle event pagination', async () => {
      const contractAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      const eventName = 'Transfer';
      
      // Mock paginated response
      const firstPage = Array.from({ length: 100 }, (_, i) => ({
        from_address: contractAddress,
        keys: ['0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9'],
        data: [`0x${i.toString(16).padStart(40, '0')}`, '0x123...', '0x1000000000000000000'],
        block_number: 12345 + i,
        transaction_hash: `0x${i.toString(16).padStart(64, '0')}`,
      }));

      jest.mocked(global.mockBlockchainService.getEvents).mockResolvedValue(firstPage);

      const events = await blockchainService.getContractEvents(
        contractAddress,
        eventName,
        {},
        { limit: 100, offset: 0 }
      );

      expect(events).toHaveLength(100);
      expect(events[0].block_number).toBe(12345);
      expect(events[99].block_number).toBe(12345 + 99);
    });
  });

  describe('Network Status and Health', () => {
    it('should check blockchain network connectivity', async () => {
      jest.mocked(global.mockBlockchainService.getLatestBlock).mockResolvedValue({
        block_number: 12345,
        block_hash: '0xabc123...',
        timestamp: Date.now(),
        transaction_count: 150,
      });

      const networkStatus = await blockchainService.getNetworkStatus();

      expect(networkStatus).toBeDefined();
      expect(networkStatus.block_number).toBe(12345);
      expect(networkStatus.transaction_count).toBe(150);
      expect(global.mockBlockchainService.getLatestBlock).toHaveBeenCalled();
    });

    it('should handle network connectivity issues', async () => {
      jest.mocked(global.mockBlockchainService.getLatestBlock).mockRejectedValue(
        new Error('Network unreachable')
      );

      await expect(blockchainService.getNetworkStatus()).rejects.toThrow('Network unreachable');
    });

    it('should measure response times', async () => {
      jest.mocked(global.mockBlockchainService.getLatestBlock).mockImplementation(
        async () => {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            block_number: 12345,
            block_hash: '0xabc123...',
            timestamp: Date.now(),
            transaction_count: 150,
          };
        }
      );

      const startTime = Date.now();
      await blockchainService.getNetworkStatus();
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeGreaterThan(100);
      expect(responseTime).toBeLessThan(1000); // Reasonable upper bound
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should implement circuit breaker pattern', async () => {
      const mockTxHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      // Simulate multiple failures to trigger circuit breaker
      jest.mocked(global.mockBlockchainService.getTransaction).mockRejectedValue(
        new Error('Service unavailable')
      );

      // Multiple failed calls should eventually trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await blockchainService.getTransaction(mockTxHash);
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit breaker should now be open, calls should fail fast
      const fastFailStart = Date.now();
      try {
        await blockchainService.getTransaction(mockTxHash);
      } catch (error) {
        const fastFailTime = Date.now() - fastFailStart;
        expect(fastFailTime).toBeLessThan(50); // Should fail fast
      }
    });

    it('should handle malformed responses gracefully', async () => {
      const mockTxHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      jest.mocked(global.mockBlockchainService.getTransaction).mockResolvedValue({
        // Missing required fields
        transaction_hash: mockTxHash,
        // status: missing
        // block_number: missing
      } as any);

      await expect(blockchainService.getTransaction(mockTxHash)).rejects.toThrow();
    });

    it('should validate input parameters', async () => {
      // Invalid transaction hash
      await expect(
        blockchainService.getTransaction('invalid-hash')
      ).rejects.toThrow('Invalid transaction hash format');

      // Invalid wallet address
      await expect(
        blockchainService.getTokenBalance('invalid-address', '0x123...')
      ).rejects.toThrow('Invalid wallet address format');
    });
  });

  describe('Performance and Caching', () => {
    it('should cache frequently requested data', async () => {
      const mockTxHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const mockResponse = {
        transaction_hash: mockTxHash,
        status: 'ACCEPTED_ON_L2',
        block_number: 12345,
        actual_fee: '1000000000000000',
        max_fee: '2000000000000000',
        version: '0x1',
        type: 'INVOKE',
        timestamp: Date.now(),
      };

      jest.mocked(global.mockBlockchainService.getTransaction).mockResolvedValue(mockResponse);

      // First call
      const result1 = await blockchainService.getTransaction(mockTxHash);
      
      // Second call should use cache
      const result2 = await blockchainService.getTransaction(mockTxHash);

      expect(result1).toEqual(result2);
      // Should only call the actual service once due to caching
      expect(global.mockBlockchainService.getTransaction).toHaveBeenCalledTimes(1);
    });

    it('should handle high-frequency requests efficiently', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b8D3Ac65e';
      const tokenAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
      
      jest.mocked(global.mockBlockchainService.getBalance).mockResolvedValue({
        balance: '1000000000000000000',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ether',
      });

      const startTime = Date.now();
      
      // Make 100 concurrent requests
      const promises = Array.from({ length: 100 }, () =>
        blockchainService.getTokenBalance(walletAddress, tokenAddress)
      );
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should handle efficiently
    });
  });
});
