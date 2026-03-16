const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const routesConfig = require(path.join(
  projectRoot, 'application/config/routes.config'
));

describe('routes.config', () => {

  describe('structure', () => {
    it('should export an object', () => {
      expect(typeof routesConfig).toBe('object');
      expect(routesConfig).not.toBeNull();
    });

    it('should have a routes key', () => {
      expect(routesConfig).toHaveProperty('routes');
      expect(typeof routesConfig.routes).toBe('object');
    });

    it('should have at least one route defined', () => {
      const routeNames = Object.keys(routesConfig.routes);
      expect(routeNames.length).toBeGreaterThan(0);
    });
  });

  describe('route definitions', () => {
    const routes = routesConfig.routes;

    Object.entries(routes).forEach(([routeName, routeDef]) => {
      describe(`route: ${routeName}`, () => {
        it('should have a route path', () => {
          expect(routeDef).toHaveProperty('route');
          expect(typeof routeDef.route).toBe('string');
          expect(routeDef.route.length).toBeGreaterThan(0);
        });

        it('should have a module', () => {
          expect(routeDef).toHaveProperty('module');
          expect(typeof routeDef.module).toBe('string');
          expect(routeDef.module.length).toBeGreaterThan(0);
        });

        it('should have a controller', () => {
          expect(routeDef).toHaveProperty('controller');
          expect(typeof routeDef.controller).toBe('string');
          expect(routeDef.controller.length).toBeGreaterThan(0);
        });

        it('should have an action', () => {
          expect(routeDef).toHaveProperty('action');
          expect(typeof routeDef.action).toBe('string');
          expect(routeDef.action.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('expected routes exist', () => {
    const routes = routesConfig.routes;

    it('should have healthCheck route', () => {
      expect(routes).toHaveProperty('healthCheck');
      expect(routes.healthCheck.route).toBe('/health');
    });

    it('should have adminLoginIndex route', () => {
      expect(routes).toHaveProperty('adminLoginIndex');
      expect(routes.adminLoginIndex.route).toBe('/admin/login');
    });

    it('should have adminLoginLogout route', () => {
      expect(routes).toHaveProperty('adminLoginLogout');
      expect(routes.adminLoginLogout.route).toBe('/admin/logout');
    });

    it('should have adminHome route', () => {
      expect(routes).toHaveProperty('adminHome');
      expect(routes.adminHome.route).toBe('/');
    });

    it('should have adminMyDrive route', () => {
      expect(routes).toHaveProperty('adminMyDrive');
      expect(routes.adminMyDrive.route).toBe('/my-drive');
    });

    it('should have adminSearch route', () => {
      expect(routes).toHaveProperty('adminSearch');
      expect(routes.adminSearch.route).toBe('/search');
    });

    it('should have adminRecent route', () => {
      expect(routes).toHaveProperty('adminRecent');
      expect(routes.adminRecent.route).toBe('/recent');
    });

    it('should have adminStarred route', () => {
      expect(routes).toHaveProperty('adminStarred');
      expect(routes.adminStarred.route).toBe('/starred');
    });

    it('should have adminShared route', () => {
      expect(routes).toHaveProperty('adminShared');
      expect(routes.adminShared.route).toBe('/shared');
    });

    it('should have adminTrash route', () => {
      expect(routes).toHaveProperty('adminTrash');
      expect(routes.adminTrash.route).toBe('/trash');
    });

    it('should have adminFolderCreate route', () => {
      expect(routes).toHaveProperty('adminFolderCreate');
      expect(routes.adminFolderCreate.route).toBe('/admin/folder/create');
    });

    it('should have adminFolderDelete route', () => {
      expect(routes).toHaveProperty('adminFolderDelete');
    });

    it('should have adminFolderDownload route', () => {
      expect(routes).toHaveProperty('adminFolderDownload');
    });

    it('should have adminFileDelete route', () => {
      expect(routes).toHaveProperty('adminFileDelete');
    });

    it('should have adminFileDownload route', () => {
      expect(routes).toHaveProperty('adminFileDownload');
    });

    it('should have adminFileView route', () => {
      expect(routes).toHaveProperty('adminFileView');
    });

    it('should have adminFileUpload route', () => {
      expect(routes).toHaveProperty('adminFileUpload');
      expect(routes.adminFileUpload.route).toBe('/api/file/upload');
    });

    it('should have adminFileUpdate route', () => {
      expect(routes).toHaveProperty('adminFileUpdate');
    });

    it('should have adminFilePermissions route', () => {
      expect(routes).toHaveProperty('adminFilePermissions');
    });

    it('should have adminFileShare route', () => {
      expect(routes).toHaveProperty('adminFileShare');
    });

    it('should have adminFileLinkCreate route', () => {
      expect(routes).toHaveProperty('adminFileLinkCreate');
    });

    it('should have adminUserSearch route', () => {
      expect(routes).toHaveProperty('adminUserSearch');
      expect(routes.adminUserSearch.route).toBe('/api/user/search');
    });

    it('should have publicFileLink route', () => {
      expect(routes).toHaveProperty('publicFileLink');
      expect(routes.publicFileLink.route).toBe('/s/:token');
    });

    it('should have publicFileDownload route', () => {
      expect(routes).toHaveProperty('publicFileDownload');
      expect(routes.publicFileDownload.route).toBe('/s/:token/download');
    });

    it('should have publicFileServe route', () => {
      expect(routes).toHaveProperty('publicFileServe');
      expect(routes.publicFileServe.route).toBe('/p/:public_key');
    });

    it('should have adminFileDerivative route', () => {
      expect(routes).toHaveProperty('adminFileDerivative');
      expect(routes.adminFileDerivative.route).toBe('/admin/file/derivative');
    });

    it('should have adminFolderStarToggle route', () => {
      expect(routes).toHaveProperty('adminFolderStarToggle');
    });

    it('should have adminFolderStateToggle route', () => {
      expect(routes).toHaveProperty('adminFolderStateToggle');
    });

    it('should have adminFolderListJson route', () => {
      expect(routes).toHaveProperty('adminFolderListJson');
    });

    it('should have adminFolderPrefetch route', () => {
      expect(routes).toHaveProperty('adminFolderPrefetch');
    });

    it('should have adminFilePrefetch route', () => {
      expect(routes).toHaveProperty('adminFilePrefetch');
    });
  });

  describe('route paths', () => {
    it('all route paths should start with /', () => {
      Object.values(routesConfig.routes).forEach((routeDef) => {
        expect(routeDef.route.startsWith('/')).toBe(true);
      });
    });

    it('all modules should be admin', () => {
      Object.values(routesConfig.routes).forEach((routeDef) => {
        expect(routeDef.module).toBe('admin');
      });
    });
  });
});
