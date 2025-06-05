import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, TreeRepository, Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RoleService } from '../services/system-health.service';
import { AuditService } from '../services/audit.service';
import { Role, RoleType, RoleLevel } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { UserGroupRole } from '../entities/user-group-role.entity';
describe('RoleService', () => {
  let service: RoleService;
  let roleRepository: TreeRepository<Role>;
  let permissionRepository: TreeRepository<Permission>;
  let userGroupRoleRepository: Repository<UserGroupRole>;

  const mockRoleRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findTrees: jest.fn(),
    findDescendants: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockPermissionRepository = {
    findBy: jest.fn(),
    findDescendants: jest.fn(),
  };

  const mockUserGroupRoleRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockAuditService = {
    logRoleAction: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionRepository,
        },
        {
          provide: getRepositoryToken(UserGroupRole),
          useValue: mockUserGroupRoleRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    roleRepository = module.get<TreeRepository<Role>>(getRepositoryToken(Role));
    permissionRepository = module.get<TreeRepository<Permission>>(getRepositoryToken(Permission));
    userGroupRoleRepository = module.get<Repository<UserGroupRole>>(getRepositoryToken(UserGroupRole));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRole', () => {
    it('should create a new role successfully', async () => {
      const createRoleDto = {
        name: 'Test Role',
        description: 'Test role description',
        permissionIds: [1, 2],
      };

      const mockRole = {
        id: 1,
        ...createRoleDto,
        type: RoleType.CUSTOM,
        level: RoleLevel.MEMBER,
      };

      mockRoleRepository.findOne.mockResolvedValue(null); // No existing role
      mockPermissionRepository.findBy.mockResolvedValue([
        { id: 1, name: 'permission1' },
        { id: 2, name: 'permission2' },
      ]);
      mockRoleRepository.create.mockReturnValue(mockRole);
      mockDataSource.createQueryRunner().manager.save.mockResolvedValue(mockRole);

      const result = await service.createRole(createRoleDto, 1, 1);

      expect(result).toEqual(mockRole);
      expect(mockAuditService.logRoleAction).toHaveBeenCalled();
    });

    it('should throw error if role name already exists', async () => {
      const createRoleDto = {
        name: 'Existing Role',
        description: 'Test description',
      };

      mockRoleRepository.findOne.mockResolvedValue({ id: 1, name: 'Existing Role' });

      await expect(
        service.createRole(createRoleDto, 1, 1),
      ).rejects.toThrow('Role with this name already exists');
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has permission', async () => {
      const mockPermissions = [
        { id: 1, name: 'test.permission' },
      ];

      jest.spyOn(service, 'getUserPermissions').mockResolvedValue(mockPermissions);

      const result = await service.hasPermission(1, 1, 'test.permission');

      expect(result).toBe(true);
    });

    it('should return false if user does not have permission', async () => {
      jest.spyOn(service, 'getUserPermissions').mockResolvedValue([]);

      const result = await service.hasPermission(1, 1, 'test.permission');

      expect(result).toBe(false);
    });
  });
});
