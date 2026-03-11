const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
const RouteMatch = require(path.join(projectRoot, 'library/mvc/router/route-match'));

describe('RouteMatch', () => {
  describe('constructor', () => {
    it('should create with defaults', () => {
      const rm = new RouteMatch();
      expect(rm.getParams()).toEqual({});
      expect(rm.getMatchedRouteName()).toBeNull();
    });

    it('should accept params and route name', () => {
      const rm = new RouteMatch({ module: 'blog', controller: 'index' }, 'home');
      expect(rm.getParam('module')).toBe('blog');
      expect(rm.getMatchedRouteName()).toBe('home');
    });

    it('should normalize falsy route name to null', () => {
      const rm = new RouteMatch({}, '');
      expect(rm.getMatchedRouteName()).toBeNull();
    });
  });

  describe('getParam / setParam', () => {
    it('should set and get a param', () => {
      const rm = new RouteMatch();
      expect(rm.setParam('action', 'list')).toBe(rm);
      expect(rm.getParam('action')).toBe('list');
    });

    it('should return default for missing param', () => {
      const rm = new RouteMatch();
      expect(rm.getParam('missing')).toBeNull();
      expect(rm.getParam('missing', 'default')).toBe('default');
    });
  });

  describe('removeParam', () => {
    it('should remove existing param', () => {
      const rm = new RouteMatch({ key: 'val' });
      expect(rm.removeParam('key')).toBe(rm);
      expect(rm.hasParam('key')).toBe(false);
    });

    it('should handle removing non-existent param', () => {
      const rm = new RouteMatch();
      expect(rm.removeParam('nope')).toBe(rm);
    });
  });

  describe('getParams / setParams', () => {
    it('should return shallow copy', () => {
      const rm = new RouteMatch({ a: 1 });
      const p = rm.getParams();
      p.a = 999;
      expect(rm.getParam('a')).toBe(1);
    });

    it('should merge params', () => {
      const rm = new RouteMatch({ a: 1 });
      expect(rm.setParams({ b: 2 })).toBe(rm);
      expect(rm.getParam('a')).toBe(1);
      expect(rm.getParam('b')).toBe(2);
    });
  });

  describe('route name', () => {
    it('should set/get matched route name', () => {
      const rm = new RouteMatch();
      expect(rm.setMatchedRouteName('blogIndex')).toBe(rm);
      expect(rm.getMatchedRouteName()).toBe('blogIndex');
    });

    it('should alias getRouteName/setRouteName', () => {
      const rm = new RouteMatch();
      rm.setRouteName('test');
      expect(rm.getRouteName()).toBe('test');
    });

    it('should normalize falsy route name to null', () => {
      const rm = new RouteMatch({}, 'test');
      rm.setMatchedRouteName('');
      expect(rm.getMatchedRouteName()).toBeNull();
    });
  });

  describe('convenience getters', () => {
    it('should get module, controller, action', () => {
      const rm = new RouteMatch({ module: 'admin', controller: 'post', action: 'edit' });
      expect(rm.getModule()).toBe('admin');
      expect(rm.getController()).toBe('post');
      expect(rm.getAction()).toBe('edit');
    });

    it('should return null for missing convenience params', () => {
      const rm = new RouteMatch();
      expect(rm.getModule()).toBeNull();
      expect(rm.getController()).toBeNull();
      expect(rm.getAction()).toBeNull();
    });
  });

  describe('hasParam', () => {
    it('should return true for existing param', () => {
      const rm = new RouteMatch({ key: 'val' });
      expect(rm.hasParam('key')).toBe(true);
    });

    it('should return false for missing param', () => {
      const rm = new RouteMatch();
      expect(rm.hasParam('key')).toBe(false);
    });
  });

  describe('toObject / fromObject', () => {
    it('should serialize to object', () => {
      const rm = new RouteMatch({ a: 1 }, 'route1');
      const obj = rm.toObject();
      expect(obj.matchedRouteName).toBe('route1');
      expect(obj.params.a).toBe(1);
    });

    it('should create from object', () => {
      const rm = RouteMatch.fromObject({ params: { b: 2 }, matchedRouteName: 'route2' });
      expect(rm.getParam('b')).toBe(2);
      expect(rm.getMatchedRouteName()).toBe('route2');
    });

    it('should handle null/undefined input in fromObject', () => {
      const rm = RouteMatch.fromObject(null);
      expect(rm.getParams()).toEqual({});
      expect(rm.getMatchedRouteName()).toBeNull();
    });

    it('should handle empty object in fromObject', () => {
      const rm = RouteMatch.fromObject({});
      expect(rm.getParams()).toEqual({});
      expect(rm.getMatchedRouteName()).toBeNull();
    });
  });
});
