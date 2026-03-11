const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
const ViewManager = require(path.join(projectRoot, 'library/mvc/view/view-manager'));

describe('ViewManager', () => {
  describe('constructor defaults', () => {
    it('should use defaults when no config', () => {
      const vm = new ViewManager();
      expect(vm.getNotFoundTemplate()).toBe('error/404');
      expect(vm.getExceptionTemplate()).toBe('error/500');
      expect(vm.shouldDisplayNotFoundReason()).toBe(false);
      expect(vm.shouldDisplayExceptions()).toBe(false);
      expect(vm.getDoctype()).toBe('HTML5');
      expect(vm.getTemplatePathStack()).toEqual([]);
    });
  });

  describe('constructor with config', () => {
    it('should accept custom config', () => {
      const vm = new ViewManager({
        display_not_found_reason: true,
        display_exceptions: true,
        doctype: 'XHTML',
        not_found_template: 'custom/404',
        exception_template: 'custom/500',
        template_path_stack: ['/views']
      });
      expect(vm.getNotFoundTemplate()).toBe('custom/404');
      expect(vm.getExceptionTemplate()).toBe('custom/500');
      expect(vm.shouldDisplayNotFoundReason()).toBe(true);
      expect(vm.shouldDisplayExceptions()).toBe(true);
      expect(vm.getDoctype()).toBe('XHTML');
      expect(vm.getTemplatePathStack()).toEqual(['/views']);
    });

    it('should handle non-array template_path_stack', () => {
      const vm = new ViewManager({ template_path_stack: 'notarray' });
      expect(vm.getTemplatePathStack()).toEqual([]);
    });
  });

  describe('resolveTemplate', () => {
    it('should return error/500.njk for falsy template', () => {
      const vm = new ViewManager();
      expect(vm.resolveTemplate(null)).toBe('error/500.njk');
      expect(vm.resolveTemplate('')).toBe('error/500.njk');
    });

    it('should use template_map if entry exists', () => {
      const vm = new ViewManager({ template_map: { 'layout/master': '/views/layout/master.njk' } });
      expect(vm.resolveTemplate('layout/master')).toBe('/views/layout/master.njk');
    });

    it('should return template as-is if it has an extension', () => {
      const vm = new ViewManager();
      expect(vm.resolveTemplate('page.html')).toBe('page.html');
    });

    it('should append .njk if no extension', () => {
      const vm = new ViewManager();
      expect(vm.resolveTemplate('blog/index')).toBe('blog/index.njk');
    });

    it('should not double-add .njk', () => {
      const vm = new ViewManager();
      expect(vm.resolveTemplate('blog/index.njk')).toBe('blog/index.njk');
    });
  });

  describe('getNunjucksPaths', () => {
    it('should return template path stack', () => {
      const vm = new ViewManager({ template_path_stack: ['/a', '/b'] });
      expect(vm.getNunjucksPaths()).toEqual(['/a', '/b']);
    });
  });

  describe('createErrorViewModel', () => {
    it('should create 404 view model', () => {
      const vm = new ViewManager();
      const result = vm.createErrorViewModel(404, 'Not found');
      expect(result.variables.pageTitle).toBe('Page Not Found');
      expect(result.variables.errorMessage).toBe('Not found');
      expect(result.variables.errorCode).toBe(404);
      expect(result.variables._status).toBe(404);
    });

    it('should create 500 view model', () => {
      const vm = new ViewManager();
      const result = vm.createErrorViewModel(500, 'Server error');
      expect(result.variables.pageTitle).toBe('Internal Server Error');
      expect(result.variables.errorMessage).toBe('Server error');
    });

    it('should create default error view model for other codes', () => {
      const vm = new ViewManager();
      const result = vm.createErrorViewModel(403, 'Forbidden');
      expect(result.variables.pageTitle).toBe('Error');
      expect(result.variables.errorMessage).toBe('Forbidden');
    });

    it('should use default message when message is empty', () => {
      const vm = new ViewManager();
      const r404 = vm.createErrorViewModel(404, '');
      expect(r404.variables.errorMessage).toBe('The page you are looking for could not be found.');
      const r500 = vm.createErrorViewModel(500, '');
      expect(r500.variables.errorMessage).toBe('Something went wrong on our end. Please try again later.');
      const r403 = vm.createErrorViewModel(403, '');
      expect(r403.variables.errorMessage).toBe('An error occurred while processing your request.');
    });

    it('should include error details when display_exceptions is true', () => {
      const vm = new ViewManager({ display_exceptions: true });
      const err = new Error('test error');
      const result = vm.createErrorViewModel(500, 'fail', err);
      expect(result.variables.errorDetails).toBeDefined();
      expect(result.variables.errorDetails.message).toBe('test error');
      expect(result.variables.errorDetails.stack).toBeDefined();
    });

    it('should not include error details when display_exceptions is false', () => {
      const vm = new ViewManager();
      const err = new Error('test');
      const result = vm.createErrorViewModel(500, 'fail', err);
      expect(result.variables.errorDetails).toBeUndefined();
    });

    it('should include debug info for 404 when display_not_found_reason is true', () => {
      const vm = new ViewManager({ display_not_found_reason: true });
      const err = { requestUrl: '/missing' };
      const result = vm.createErrorViewModel(404, 'Not found', err);
      expect(result.variables.debugInfo).toBeDefined();
      expect(result.variables.debugInfo.requestUrl).toBe('/missing');
    });

    it('should handle 404 debug info with no error object', () => {
      const vm = new ViewManager({ display_not_found_reason: true });
      const result = vm.createErrorViewModel(404, 'Not found');
      expect(result.variables.debugInfo.requestUrl).toBe('Unknown');
    });

    it('should not include debug info for non-404', () => {
      const vm = new ViewManager({ display_not_found_reason: true });
      const result = vm.createErrorViewModel(500, 'fail');
      expect(result.variables.debugInfo).toBeUndefined();
    });
  });
});
