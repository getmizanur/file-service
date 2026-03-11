const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const AbstractOption = require(path.join(projectRoot, 'library/core/common/abstract-option'));

class TestOption extends AbstractOption {
  setFoo(v) { this.foo = v; return this; }
  setBarBaz(v) { this.barBaz = v; return this; }
}

describe('AbstractOption', () => {
  it('should not be directly constructable', () => {
    expect(() => new AbstractOption()).toThrow('AbstractOption cannot be instantiated directly');
  });

  it('should be constructable via subclass', () => {
    const opt = new TestOption();
    expect(opt).toBeDefined();
  });

  it('should apply options via setter methods', () => {
    const opt = new TestOption({ foo: 'hello' });
    expect(opt.foo).toBe('hello');
  });

  it('should convert snake_case keys to setters', () => {
    const opt = new TestOption({ bar_baz: 'world' });
    expect(opt.barBaz).toBe('world');
  });

  it('should throw for unknown option', () => {
    expect(() => new TestOption({ unknown_key: 'x' })).toThrow('Unknown option "unknown_key"');
  });

  it('getRawOptions should return original options', () => {
    const opts = { foo: 'test' };
    const opt = new TestOption(opts);
    expect(opt.getRawOptions()).toBe(opts);
  });

  describe('_keyToSetter', () => {
    it('should convert snake_case to setter', () => {
      const opt = new TestOption();
      expect(opt._keyToSetter('foo')).toBe('setFoo');
      expect(opt._keyToSetter('bar_baz')).toBe('setBarBaz');
    });
  });
});
