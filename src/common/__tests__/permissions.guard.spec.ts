import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RoleService } from '../services/role.service';
describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let roleService: RoleService;
  let reflector: Reflector;

  const mockRoleService = {
    hasPermission: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    roleService = module.get<RoleService>(RoleService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow access if no permissions required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);

    const context = createMockExecutionContext({ user: { id: 1 } });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow access if user has required permissions', async () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(['test.permission']) 
      .mockReturnValueOnce(true); 

    mockRoleService.hasPermission.mockResolvedValue(true);

    const context = createMockExecutionContext({
      user: { id: 1 },
      params: { groupId: '1' },
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockRoleService.hasPermission).toHaveBeenCalledWith(1, 1, 'test.permission');
  });

  it('should deny access if user lacks required permissions', async () => {
    mockReflector.getAllAndOverride
      .mockReturnValueOnce(['test.permission'])
      .mockReturnValueOnce(true);

    mockRoleService.hasPermission.mockResolvedValue(false);

    const context = createMockExecutionContext({
      user: { id: 1 },
      params: { groupId: '1' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow();
  });

  function createMockExecutionContext(request: any): ExecutionContext {
    return {
        switchToHttp: () => ({
            getRequest: () => request,
            getResponse: () => ({}),
            getNext: () => jest.fn(),
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
        getArgs: () => [],
        getArgByIndex: () => ({}),
        switchToRpc: () => ({
            getData: () => ({}),
            getContext: () => ({}),
        }),
        switchToWs: () => ({
            getData: () => ({}),
            getClient: () => ({}),
        }),
        getType: () => 'http',
    } as unknown as ExecutionContext;
  }
});
