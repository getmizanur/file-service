const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Layout = require(path.join(projectRoot, 'library/mvc/controller/plugin/layout'));

function createMockController(overrides = {}) {
  return {
    getRequest: jest.fn(),
    getResponse: jest.fn(),
    getServiceManager: jest.fn(() => ({ get: jest.fn() })),
    plugin: jest.fn(),
    getView: jest.fn(() => null),
    getRouteMatch: jest.fn(() => null),
    ...overrides
  };
}

describe('Layout Plugin', () => {
  it('should return default template when no controller', () => {
    const layout = new Layout();
    expect(layout.getTemplate()).toBe('application/default/index/index.njk');
  });

  it('should use custom baseDir', () => {
    const layout = new Layout({ baseDir: 'custom' });
    expect(layout.getTemplate()).toBe('custom/default/index/index.njk');
  });

  it('should return viewModel template if available', () => {
    const layout = new Layout();
    const ctrl = createMockController({
      getView: jest.fn(() => ({ getTemplate: () => 'custom/template.njk' }))
    });
    layout.setController(ctrl);
    expect(layout.getTemplate()).toBe('custom/template.njk');
  });

  it('should build template from routeMatch', () => {
    const layout = new Layout();
    const ctrl = createMockController({
      getView: jest.fn(() => ({ getTemplate: () => null })),
      getRouteMatch: jest.fn(() => ({
        getModule: () => 'admin',
        getController: () => 'post',
        getAction: () => 'edit'
      }))
    });
    layout.setController(ctrl);
    expect(layout.getTemplate()).toBe('application/admin/post/edit.njk');
  });

  it('should handle missing routeMatch', () => {
    const layout = new Layout();
    const ctrl = createMockController({
      getView: jest.fn(() => null),
      getRouteMatch: jest.fn(() => null)
    });
    layout.setController(ctrl);
    const tpl = layout.getTemplate();
    expect(tpl).toContain('default/index/index');
  });

  it('should handle viewModel without getTemplate', () => {
    const layout = new Layout();
    const ctrl = createMockController({
      getView: jest.fn(() => ({}))
    });
    layout.setController(ctrl);
    const tpl = layout.getTemplate();
    expect(tpl).toBeDefined();
  });

  // --- Branch coverage ---
  it('should handle controller without getView function (line 33)', () => {
    const layout = new Layout();
    const ctrl = createMockController();
    delete ctrl.getView;
    layout.setController(ctrl);
    const tpl = layout.getTemplate();
    expect(tpl).toContain('default/index/index');
  });

  it('should handle controller without getRouteMatch (line 41)', () => {
    const layout = new Layout();
    const ctrl = createMockController({
      getView: jest.fn(() => null)
    });
    delete ctrl.getRouteMatch;
    layout.setController(ctrl);
    const tpl = layout.getTemplate();
    expect(tpl).toContain('default/index/index');
  });

  it('should handle routeMatch returning empty module name (line 47)', () => {
    const layout = new Layout();
    const ctrl = createMockController({
      getView: jest.fn(() => null),
      getRouteMatch: jest.fn(() => ({
        getModule: () => '',
        getController: () => 'index',
        getAction: () => 'index'
      }))
    });
    layout.setController(ctrl);
    const tpl = layout.getTemplate();
    expect(tpl).toContain('/default/');
  });

  it('should handle routeMatch returning empty controller name (line 51)', () => {
    const layout = new Layout();
    const ctrl = createMockController({
      getView: jest.fn(() => null),
      getRouteMatch: jest.fn(() => ({
        getModule: () => 'admin',
        getController: () => '',
        getAction: () => 'view'
      }))
    });
    layout.setController(ctrl);
    const tpl = layout.getTemplate();
    expect(tpl).toContain('/index/');
  });

  it('should handle routeMatch returning empty action name (line 55)', () => {
    const layout = new Layout();
    const ctrl = createMockController({
      getView: jest.fn(() => null),
      getRouteMatch: jest.fn(() => ({
        getModule: () => 'admin',
        getController: () => 'post',
        getAction: () => ''
      }))
    });
    layout.setController(ctrl);
    const tpl = layout.getTemplate();
    expect(tpl).toContain('/index.njk');
  });

  it('should convert nested controller name to path (line 52)', () => {
    const layout = new Layout();
    const ctrl = createMockController({
      getView: jest.fn(() => null),
      getRouteMatch: jest.fn(() => ({
        getModule: () => 'admin',
        getController: () => 'ReportDashboard',
        getAction: () => 'viewAction'
      }))
    });
    layout.setController(ctrl);
    const tpl = layout.getTemplate();
    expect(tpl).toBe('application/admin/report/dashboard/view.njk');
  });

  it('should handle viewModel getTemplate returning empty string (line 37)', () => {
    const layout = new Layout();
    const ctrl = createMockController({
      getView: jest.fn(() => ({ getTemplate: () => '' })),
      getRouteMatch: jest.fn(() => null)
    });
    layout.setController(ctrl);
    const tpl = layout.getTemplate();
    expect(tpl).toContain('default/index/index');
  });
});
