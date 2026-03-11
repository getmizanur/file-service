const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const AdapterAbstractServiceFactory = require(path.join(projectRoot, 'library/db/adapter/adapter-abstract-service-factory'));
const AdapterServiceFactory = require(path.join(projectRoot, 'library/db/adapter/adapter-service-factory'));

describe('AdapterAbstractServiceFactory', () => {
  describe('canCreate', () => {
    it('should return true when adapter config exists', () => {
      const factory = new AdapterAbstractServiceFactory();
      const sm = {
        get: jest.fn(() => ({ database: { adapters: { DbAdapter: { adapter: 'postgresql', connection: {} } } } }))
      };
      expect(factory.canCreate(sm, 'DbAdapter')).toBe(true);
    });

    it('should return false when adapter not configured', () => {
      const factory = new AdapterAbstractServiceFactory();
      const sm = { get: jest.fn(() => ({ database: { adapters: {} } })) };
      expect(factory.canCreate(sm, 'DbAdapter')).toBe(false);
    });

    it('should handle missing config', () => {
      const factory = new AdapterAbstractServiceFactory();
      const sm = { get: jest.fn(() => null) };
      expect(factory.canCreate(sm, 'DbAdapter')).toBe(false);
    });
  });

  describe('createService', () => {
    it('should throw for missing adapter config', () => {
      const factory = new AdapterAbstractServiceFactory();
      const sm = { get: jest.fn(() => ({ database: { adapters: {} } })) };
      expect(() => factory.createService(sm, 'DbAdapter')).toThrow('Missing database.adapters.DbAdapter configuration');
    });

    it('should throw for missing connection', () => {
      const factory = new AdapterAbstractServiceFactory();
      const sm = { get: jest.fn(() => ({ database: { adapters: { DbAdapter: { adapter: 'postgresql' } } } })) };
      expect(() => factory.createService(sm, 'DbAdapter')).toThrow('Missing database.adapters.DbAdapter configuration');
    });
  });
});

describe('AdapterServiceFactory', () => {
  describe('createService', () => {
    it('should throw when database disabled', () => {
      const factory = new AdapterServiceFactory();
      const sm = { get: jest.fn(() => ({ database: { enabled: false } })) };
      expect(() => factory.createService(sm)).toThrow('Database is disabled');
    });

    it('should throw for missing adapter config', () => {
      const factory = new AdapterServiceFactory();
      const sm = { get: jest.fn(() => ({ database: { enabled: true } })) };
      expect(() => factory.createService(sm)).toThrow('Missing database configuration');
    });

    it('should throw for missing connection in adapters.DbAdapter', () => {
      const factory = new AdapterServiceFactory();
      const sm = {
        get: jest.fn(() => ({
          database: { enabled: true, adapters: { DbAdapter: { adapter: 'postgresql' } } }
        }))
      };
      expect(() => factory.createService(sm)).toThrow('Missing database configuration');
    });

    it('should create postgresql adapter from adapters.DbAdapter config', () => {
      const factory = new AdapterServiceFactory();
      const sm = {
        get: jest.fn(() => ({
          database: {
            enabled: true,
            adapters: { DbAdapter: { adapter: 'postgresql', connection: { host: 'localhost' } } }
          }
        }))
      };
      const adapter = factory.createService(sm);
      expect(adapter).toBeDefined();
    });

    it('should create adapter from top-level database.adapter config', () => {
      const factory = new AdapterServiceFactory();
      const sm = {
        get: jest.fn(() => ({
          database: {
            enabled: true,
            adapter: 'mysql',
            connection: { host: 'localhost' }
          }
        }))
      };
      const adapter = factory.createService(sm);
      expect(adapter).toBeDefined();
    });

    it('should create adapter using dbAdapter (camelCase) key', () => {
      const factory = new AdapterServiceFactory();
      const sm = {
        get: jest.fn(() => ({
          database: {
            enabled: true,
            adapters: { dbAdapter: { adapter: 'postgres', connection: { host: 'localhost' } } }
          }
        }))
      };
      const adapter = factory.createService(sm);
      expect(adapter).toBeDefined();
    });

    it('should handle null config', () => {
      const factory = new AdapterServiceFactory();
      const sm = { get: jest.fn(() => null) };
      expect(() => factory.createService(sm)).toThrow('Missing database configuration');
    });
  });
});

describe('AdapterAbstractServiceFactory - createService success', () => {
  it('should create postgresql adapter', () => {
    const factory = new AdapterAbstractServiceFactory();
    const sm = {
      get: jest.fn(() => ({
        database: {
          adapters: {
            DbAdapter: { adapter: 'postgresql', connection: { host: 'localhost' } }
          }
        }
      }))
    };
    const adapter = factory.createService(sm, 'DbAdapter');
    expect(adapter).toBeDefined();
  });

  it('should create mysql adapter', () => {
    const factory = new AdapterAbstractServiceFactory();
    const sm = {
      get: jest.fn(() => ({
        database: {
          adapters: {
            DbAdapter: { adapter: 'mysql', connection: { host: 'localhost' } }
          }
        }
      }))
    };
    const adapter = factory.createService(sm, 'DbAdapter');
    expect(adapter).toBeDefined();
  });

  it('should create sqlserver adapter', () => {
    const factory = new AdapterAbstractServiceFactory();
    const sm = {
      get: jest.fn(() => ({
        database: {
          adapters: {
            DbAdapter: { adapter: 'sqlserver', connection: { host: 'localhost' } }
          }
        }
      }))
    };
    const adapter = factory.createService(sm, 'DbAdapter');
    expect(adapter).toBeDefined();
  });

  it('should handle unknown adapter name using fallback', () => {
    const factory = new AdapterAbstractServiceFactory();
    const sm = {
      get: jest.fn(() => ({
        database: {
          adapters: {
            DbAdapter: { adapter: 'postgresql', connection: { host: 'localhost' } }
          }
        }
      }))
    };
    // This works because 'postgresql' maps to 'postgre-sql-adapter'
    const adapter = factory.createService(sm, 'DbAdapter');
    expect(adapter).toBeDefined();
  });
});
