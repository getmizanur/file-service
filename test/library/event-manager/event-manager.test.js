const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const EventManager = require(path.join(projectRoot, 'library/event-manager/event-manager'));

describe('EventManager', () => {
  let em;

  beforeEach(() => {
    em = new EventManager();
  });

  describe('constructor', () => {
    it('should initialize with empty listeners', () => {
      expect(Object.keys(em.listeners)).toHaveLength(0);
    });
  });

  describe('attach()', () => {
    it('should return this for chaining', () => {
      const result = em.attach('test', () => {});
      expect(result).toBe(em);
    });

    it('should store a listener for the event name', () => {
      const fn = () => {};
      em.attach('myEvent', fn);
      expect(em.listeners['myEvent']).toHaveLength(1);
      expect(em.listeners['myEvent'][0].listener).toBe(fn);
    });

    it('should default priority to 0', () => {
      em.attach('myEvent', () => {});
      expect(em.listeners['myEvent'][0].priority).toBe(0);
    });

    it('should store multiple listeners for the same event', () => {
      em.attach('myEvent', () => {});
      em.attach('myEvent', () => {});
      expect(em.listeners['myEvent']).toHaveLength(2);
    });

    it('should sort listeners by descending priority', () => {
      const low = jest.fn();
      const high = jest.fn();
      em.attach('myEvent', low, 1);
      em.attach('myEvent', high, 10);
      expect(em.listeners['myEvent'][0].listener).toBe(high);
      expect(em.listeners['myEvent'][1].listener).toBe(low);
    });
  });

  describe('trigger()', () => {
    it('should call listeners in descending priority order', () => {
      const order = [];
      em.attach('test', () => { order.push('low'); }, 1);
      em.attach('test', () => { order.push('high'); }, 10);
      em.attach('test', () => { order.push('mid'); }, 5);
      em.trigger('test', {});
      expect(order).toEqual(['high', 'mid', 'low']);
    });

    it('should return non-undefined results from listeners', () => {
      em.attach('test', () => 'result1');
      em.attach('test', () => 'result2');
      const results = em.trigger('test', {});
      expect(results).toEqual(['result1', 'result2']);
    });

    it('should exclude undefined returns from results', () => {
      em.attach('test', () => 'value');
      em.attach('test', () => undefined);
      em.attach('test', () => 'another');
      const results = em.trigger('test', {});
      expect(results).toEqual(['value', 'another']);
    });

    it('should return empty array when no listeners exist for event', () => {
      const results = em.trigger('nonexistent', {});
      expect(results).toEqual([]);
    });

    it('should return empty array when listeners return undefined', () => {
      em.attach('test', () => {});
      const results = em.trigger('test', {});
      expect(results).toEqual([]);
    });
  });

  describe('_invokeListener() - error handling', () => {
    it('should catch listener errors and return them in results', () => {
      const error = new Error('listener failed');
      em.attach('test', () => { throw error; });
      const results = em.trigger('test', {});
      expect(results).toHaveLength(1);
      expect(results[0]).toBe(error);
    });

    it('should call setException and setError on the event when listener throws', () => {
      const error = new Error('fail');
      const event = {
        setException: jest.fn(),
        setError: jest.fn()
      };
      em.attach('test', () => { throw error; });
      em.trigger('test', event);
      expect(event.setException).toHaveBeenCalledWith(error);
      expect(event.setError).toHaveBeenCalledWith(error);
    });

    it('should not fail when event has no setException/setError methods', () => {
      em.attach('test', () => { throw new Error('fail'); });
      expect(() => em.trigger('test', {})).not.toThrow();
    });

    it('should not fail when event is null', () => {
      em.attach('test', () => { throw new Error('fail'); });
      expect(() => em.trigger('test', null)).not.toThrow();
    });

    it('should continue collecting results after a listener error', () => {
      em.attach('test', () => 'before', 10);
      em.attach('test', () => { throw new Error('boom'); }, 5);
      em.attach('test', () => 'after', 1);
      const results = em.trigger('test', {});
      expect(results).toHaveLength(3);
      expect(results[0]).toBe('before');
      expect(results[1]).toBeInstanceOf(Error);
      expect(results[2]).toBe('after');
    });
  });
});
