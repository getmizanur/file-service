const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const HeadTitleFactory = require(path.join(projectRoot, 'library/mvc/view/helper/factory/head-title-factory'));
const ParamsFactory = require(path.join(projectRoot, 'library/mvc/view/helper/factory/params-factory'));
const UrlFactory = require(path.join(projectRoot, 'library/mvc/view/helper/factory/url-factory'));

describe('HeadTitleFactory', () => {
  it('should create HeadTitle helper', () => {
    const factory = new HeadTitleFactory();
    const helper = factory.createService(null);
    expect(helper).toBeDefined();
    expect(typeof helper.render).toBe('function');
  });

  it('should apply config defaults', () => {
    const factory = new HeadTitleFactory();
    const sm = {
      get: jest.fn(() => ({
        view_manager: {
          head_title: { separator: ' | ', default_title: 'My Site' }
        }
      }))
    };
    const helper = factory.createService(sm);
    expect(helper.separator).toBe(' | ');
    expect(helper.defaultTitle).toBe('My Site');
  });

  it('should handle missing config gracefully', () => {
    const factory = new HeadTitleFactory();
    const sm = { get: jest.fn(() => ({})) };
    const helper = factory.createService(sm);
    expect(helper).toBeDefined();
  });
});

describe('HeadTitleFactory - branch coverage', () => {
  it('should handle serviceManager without get function (line 18)', () => {
    const factory = new HeadTitleFactory();
    const helper = factory.createService({});
    expect(helper).toBeDefined();
  });

  it('should handle config with head_title but no separator (line 25)', () => {
    const factory = new HeadTitleFactory();
    const sm = {
      get: jest.fn(() => ({
        view_manager: { head_title: { default_title: 'Test' } }
      }))
    };
    const helper = factory.createService(sm);
    expect(helper.defaultTitle).toBe('Test');
  });

  it('should handle config with head_title but no default_title (line 28)', () => {
    const factory = new HeadTitleFactory();
    const sm = {
      get: jest.fn(() => ({
        view_manager: { head_title: { separator: ' - ' } }
      }))
    };
    const helper = factory.createService(sm);
    expect(helper.separator).toBe(' - ');
  });

  it('should handle serviceManager.get throwing (line 32 catch)', () => {
    const factory = new HeadTitleFactory();
    const sm = { get: jest.fn(() => { throw new Error('fail'); }) };
    const helper = factory.createService(sm);
    expect(helper).toBeDefined();
  });
});

describe('ParamsFactory', () => {
  it('should create Params helper', () => {
    const factory = new ParamsFactory();
    const helper = factory.createService(null);
    expect(helper).toBeDefined();
    expect(typeof helper.fromQuery).toBe('function');
  });

  it('should set request from Application service', () => {
    const factory = new ParamsFactory();
    const mockReq = { query: {} };
    const sm = {
      has: jest.fn(() => true),
      get: jest.fn((name) => {
        if (name === 'Application') return { getRequest: () => mockReq };
        return null;
      })
    };
    const helper = factory.createService(sm);
    expect(helper.request).toBe(mockReq);
  });

  it('should handle missing Application service', () => {
    const factory = new ParamsFactory();
    const sm = { has: jest.fn(() => false), get: jest.fn() };
    const helper = factory.createService(sm);
    expect(helper).toBeDefined();
  });
});

describe('ParamsFactory - branch coverage', () => {
  it('should handle Application without getRequest function (line 28-30)', () => {
    const factory = new ParamsFactory();
    const sm = {
      has: jest.fn(() => true),
      get: jest.fn(() => ({ notGetRequest: true }))
    };
    const helper = factory.createService(sm);
    expect(helper).toBeDefined();
  });

  it('should handle null request from Application (line 32)', () => {
    const factory = new ParamsFactory();
    const sm = {
      has: jest.fn(() => true),
      get: jest.fn(() => ({ getRequest: () => null }))
    };
    const helper = factory.createService(sm);
    expect(helper).toBeDefined();
  });

  it('should handle serviceManager without has function (line 26)', () => {
    const factory = new ParamsFactory();
    const helper = factory.createService({});
    expect(helper).toBeDefined();
  });

  it('should handle serviceManager.get throwing (line 36 catch)', () => {
    const factory = new ParamsFactory();
    const sm = {
      has: jest.fn(() => { throw new Error('fail'); }),
      get: jest.fn()
    };
    const helper = factory.createService(sm);
    expect(helper).toBeDefined();
  });
});

describe('UrlFactory', () => {
  it('should create Url helper', () => {
    const factory = new UrlFactory();
    const helper = factory.createService(null);
    expect(helper).toBeDefined();
    expect(typeof helper.fromRoute).toBe('function');
  });

  it('should apply debug config', () => {
    const factory = new UrlFactory();
    const sm = {
      get: jest.fn(() => ({
        view_manager: { url_helper: { debug: true } }
      }))
    };
    const helper = factory.createService(sm);
    expect(helper.debug).toBe(true);
  });

  it('should handle missing config gracefully', () => {
    const factory = new UrlFactory();
    const sm = { get: jest.fn(() => null) };
    const helper = factory.createService(sm);
    expect(helper).toBeDefined();
  });
});

describe('UrlFactory - branch coverage', () => {
  it('should handle serviceManager without get function (line 19)', () => {
    const factory = new UrlFactory();
    const helper = factory.createService({});
    expect(helper).toBeDefined();
  });

  it('should handle url_helper config that is not an object (line 25)', () => {
    const factory = new UrlFactory();
    const sm = {
      get: jest.fn(() => ({
        view_manager: { url_helper: 'not-an-object' }
      }))
    };
    const helper = factory.createService(sm);
    expect(helper).toBeDefined();
  });

  it('should handle url_helper config without debug key (line 26)', () => {
    const factory = new UrlFactory();
    const sm = {
      get: jest.fn(() => ({
        view_manager: { url_helper: { other: 'value' } }
      }))
    };
    const helper = factory.createService(sm);
    expect(helper).toBeDefined();
  });

  it('should handle serviceManager.get throwing (line 33 catch)', () => {
    const factory = new UrlFactory();
    const sm = { get: jest.fn(() => { throw new Error('fail'); }) };
    const helper = factory.createService(sm);
    expect(helper).toBeDefined();
  });
});
