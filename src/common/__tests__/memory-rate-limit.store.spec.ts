import { MemoryRateLimitStore } from '../stores/memory-rate-limit.store';

describe('MemoryRateLimitStore', () => {
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
  });

  afterEach(() => {
    store.onModuleDestroy();
  });

  describe('hit', () => {
    it('should allow first request', async () => {
      const result = await store.hit('test-key', 60000, 10);

      expect(result.allowed).toBe(true);
      expect(result.totalHits).toBe(1);
      expect(result.remaining).toBe(9);
    });

    it('should track multiple hits', async () => {
      await store.hit('test-key', 60000, 10);
      await store.hit('test-key', 60000, 10);
      const result = await store.hit('test-key', 60000, 10);

      expect(result.totalHits).toBe(3);
      expect(result.remaining).toBe(7);
    });

    it('should deny when limit exceeded', async () => {
      for (let i = 0; i < 10; i++) {
        await store.hit('test-key', 60000, 10);
      }

      const result = await store.hit('test-key', 60000, 10);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.totalHits).toBe(11);
    });

    it('should reset after window expires', async () => {
      await store.hit('test-key', 1, 10); 
      
      await new Promise(resolve => setTimeout(resolve, 2));
      
      const result = await store.hit('test-key', 1, 10);

      expect(result.totalHits).toBe(1); 
  });

  describe('reset', () => {
    it('should reset rate limit for key', async () => {
      await store.hit('test-key', 60000, 10);
      await store.reset('test-key');
      
      const result = await store.get('test-key');
      expect(result).toBeNull();
    });
  });
});
}); 
