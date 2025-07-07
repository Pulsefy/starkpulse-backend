import { Test, TestingModule } from '@nestjs/testing';
import { KeyManagementService } from './key-management.service';
import { UnauthorizedException } from '@nestjs/common';

describe('KeyManagementService (Unit Tests)', () => {
  let service: KeyManagementService;
  let setIntervalSpy: jest.SpyInstance;
  let clearIntervalSpy: jest.SpyInstance;
  let randomBytesSpy: jest.SpyInstance;

  beforeEach(async () => {
    setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockReturnValue(123 as any);
    clearIntervalSpy = jest
      .spyOn(global, 'clearInterval')
      .mockImplementation(() => {});

    randomBytesSpy = jest
      .spyOn(require('crypto'), 'randomBytes')
      .mockReturnValueOnce(Buffer.from('a'.repeat(32)))
      .mockReturnValueOnce(Buffer.from('b'.repeat(16)));

    const module: TestingModule = await Test.createTestingModule({
      providers: [KeyManagementService],
    }).compile();

    service = module.get<KeyManagementService>(KeyManagementService);
  });

  afterEach(() => {
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
    randomBytesSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate an initial key and schedule rotation on module init', () => {
    expect(randomBytesSpy).toHaveBeenCalledTimes(2);
    expect(service.getCurrentKey()).toEqual(Buffer.from('a'.repeat(32)));
    expect(service.getCurrentIv()).toEqual(Buffer.from('b'.repeat(16)));
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('should return the current key and IV', () => {
    expect(service.getCurrentKey()).toBeInstanceOf(Buffer);
    expect(service.getCurrentKey().length).toBe(32);
    expect(service.getCurrentIv()).toBeInstanceOf(Buffer);
    expect(service.getCurrentIv().length).toBe(16);
  });

  it('should return the correct algorithm', () => {
    expect(service.getAlgorithm()).toBe('aes-256-gcm');
  });

  describe('scheduleKeyRotation', () => {
    it('should clear existing interval and set a new one', () => {
      service.scheduleKeyRotation();
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
      expect(setIntervalSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('rotateKeyManually', () => {
    it('should rotate key if isAdmin is true', () => {
      randomBytesSpy
        .mockReturnValueOnce(Buffer.from('c'.repeat(32)))
        .mockReturnValueOnce(Buffer.from('d'.repeat(16)));

      const result = service.rotateKeyManually(true);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Key rotated successfully.');
      expect(service.getCurrentKey()).toEqual(Buffer.from('c'.repeat(32)));
      expect(service.getCurrentIv()).toEqual(Buffer.from('d'.repeat(16)));
      expect(randomBytesSpy).toHaveBeenCalledTimes(4);
    });

    it('should throw UnauthorizedException if isAdmin is false', () => {
      const result = service.rotateKeyManually(false);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthorized: Admin access required.');
      expect(service.getCurrentKey()).toEqual(Buffer.from('a'.repeat(32)));
      expect(randomBytesSpy).toHaveBeenCalledTimes(2);
    });
  });
});
