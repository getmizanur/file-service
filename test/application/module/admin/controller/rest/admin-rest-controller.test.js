const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const AdminRestController = require(path.join(
  projectRoot, 'application/module/admin/controller/rest/admin-rest-controller'
));
const RestController = require(path.join(
  projectRoot, 'library/mvc/controller/rest-controller'
));
const BaseController = require(path.join(
  projectRoot, 'library/mvc/controller/base-controller'
));

describe('AdminRestController', () => {

  describe('class definition', () => {
    it('should be a function (constructor)', () => {
      expect(typeof AdminRestController).toBe('function');
    });

    it('should extend RestController', () => {
      const ctrl = new AdminRestController();
      expect(ctrl).toBeInstanceOf(RestController);
    });

    it('should extend BaseController', () => {
      const ctrl = new AdminRestController();
      expect(ctrl).toBeInstanceOf(BaseController);
    });
  });

  describe('prototype methods', () => {
    const proto = AdminRestController.prototype;

    it('should have getSm', () => {
      expect(typeof proto.getSm).toBe('function');
    });

    it('should have requireIdentity', () => {
      expect(typeof proto.requireIdentity).toBe('function');
    });

    it('should have requireUserContext', () => {
      expect(typeof proto.requireUserContext).toBe('function');
    });

    it('should have requireTenantId', () => {
      expect(typeof proto.requireTenantId).toBe('function');
    });

    it('should have validate', () => {
      expect(typeof proto.validate).toBe('function');
    });
  });

  describe('getSm()', () => {
    it('should return the service manager', () => {
      const sm = { get: jest.fn() };
      const ctrl = new AdminRestController({ serviceManager: sm });
      expect(ctrl.getSm()).toBe(sm);
    });
  });

  describe('validate()', () => {
    it('should return validated values for valid data', () => {
      const ctrl = new AdminRestController();
      const schema = {
        name: {
          required: true,
          filters: [{ name: 'StringTrim' }]
        }
      };
      const result = ctrl.validate(schema, { name: '  hello  ' });
      expect(result).toHaveProperty('name');
      expect(result.name).toBe('hello');
    });

    it('should throw for invalid data', () => {
      const ctrl = new AdminRestController();
      const schema = {
        email: {
          required: true,
          validators: [{ name: 'EmailAddress' }]
        }
      };
      expect(() => ctrl.validate(schema, { email: '' })).toThrow('Invalid request');
    });

    it('should return values for multiple schema keys', () => {
      const ctrl = new AdminRestController();
      const schema = {
        name: { required: true, filters: [{ name: 'StringTrim' }] },
        age: { required: false },
      };
      const result = ctrl.validate(schema, { name: 'Alice', age: '30' });
      expect(result.name).toBe('Alice');
      expect(result.age).toBe('30');
    });
  });

  describe('requireIdentity()', () => {
    it('should throw 401 when no identity', async () => {
      const sm = {
        get: jest.fn().mockReturnValue({
          hasIdentity: () => false
        })
      };
      const ctrl = new AdminRestController({ serviceManager: sm });

      await expect(ctrl.requireIdentity()).rejects.toThrow('Login required');
      try {
        await ctrl.requireIdentity();
      } catch (e) {
        expect(e.statusCode).toBe(401);
      }
    });

    it('should return identity when authenticated', async () => {
      const identity = { email: 'test@example.com' };
      const sm = {
        get: jest.fn().mockReturnValue({
          hasIdentity: () => true,
          getIdentity: () => identity
        })
      };
      const ctrl = new AdminRestController({ serviceManager: sm });

      const result = await ctrl.requireIdentity();
      expect(result).toBe(identity);
    });
  });

  describe('requireUserContext()', () => {
    it('should return user context with email, user_id, and tenant_id', async () => {
      const identity = { email: 'test@example.com' };
      const mockUserService = {
        getUserWithTenantByEmail: jest.fn().mockResolvedValue({
          user_id: 'u1',
          tenant_id: 't1',
        }),
      };
      const sm = {
        get: jest.fn((name) => {
          if (name === 'AuthenticationService') return {
            hasIdentity: () => true,
            getIdentity: () => identity,
          };
          if (name === 'UserService') return mockUserService;
          return {};
        }),
      };
      const ctrl = new AdminRestController({ serviceManager: sm });
      const result = await ctrl.requireUserContext();
      expect(result).toEqual({
        email: 'test@example.com',
        user_id: 'u1',
        tenant_id: 't1',
      });
      expect(mockUserService.getUserWithTenantByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw when user not found', async () => {
      const sm = {
        get: jest.fn((name) => {
          if (name === 'AuthenticationService') return {
            hasIdentity: () => true,
            getIdentity: () => ({ email: 'test@example.com' }),
          };
          if (name === 'UserService') return {
            getUserWithTenantByEmail: jest.fn().mockResolvedValue(null),
          };
          return {};
        }),
      };
      const ctrl = new AdminRestController({ serviceManager: sm });
      await expect(ctrl.requireUserContext()).rejects.toThrow('User not found');
    });

    it('should throw 401 when not authenticated', async () => {
      const sm = {
        get: jest.fn().mockReturnValue({
          hasIdentity: () => false,
        }),
      };
      const ctrl = new AdminRestController({ serviceManager: sm });
      await expect(ctrl.requireUserContext()).rejects.toThrow('Login required');
    });
  });

  describe('requireTenantId()', () => {
    it('should return tenant id from root folder', async () => {
      const sm = {
        get: jest.fn((name) => {
          if (name === 'AuthenticationService') return {
            hasIdentity: () => true,
            getIdentity: () => ({ email: 'test@example.com' }),
          };
          if (name === 'FolderService') return {
            getRootFolderByUserEmail: jest.fn().mockResolvedValue({
              getTenantId: () => 't1',
            }),
          };
          return {};
        }),
      };
      const ctrl = new AdminRestController({ serviceManager: sm });
      const result = await ctrl.requireTenantId();
      expect(result).toBe('t1');
    });

    it('should throw when not authenticated', async () => {
      const sm = {
        get: jest.fn().mockReturnValue({
          hasIdentity: () => false,
        }),
      };
      const ctrl = new AdminRestController({ serviceManager: sm });
      await expect(ctrl.requireTenantId()).rejects.toThrow('Login required');
    });
  });

  describe('instantiation', () => {
    it('should create an instance with default options', () => {
      const ctrl = new AdminRestController();
      expect(ctrl).toBeDefined();
      expect(ctrl.noRender).toBe(true);
    });

    it('should accept options', () => {
      const sm = { setController: jest.fn() };
      const ctrl = new AdminRestController({ serviceManager: sm });
      expect(ctrl.serviceManager).toBe(sm);
    });
  });
});
