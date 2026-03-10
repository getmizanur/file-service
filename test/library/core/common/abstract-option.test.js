const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const AbstractOption = require(path.join(projectRoot, 'library/core/common/abstract-option'));

class TestOption extends AbstractOption {
  constructor(options = {}) {
    super(options);
  }
  setFoo(v) { this.foo = v; }
  setBarBaz(v) { this.barBaz = v; }
}

describe('AbstractOption', () => {
  it('should throw when instantiated directly', () => {
    expect(() => new AbstractOption()).toThrow('AbstractOption cannot be instantiated directly');
  });

  it('should throw when instantiated directly with options', () => {
    expect(() => new AbstractOption({ foo: 'bar' })).toThrow('AbstractOption cannot be instantiated directly');
  });

  it('should return raw options via getRawOptions()', () => {
    const opts = { foo: 'bar' };
    const instance = new TestOption(opts);
    expect(instance.getRawOptions()).toBe(opts);
  });

  it('should apply options via setter methods', () => {
    const instance = new TestOption({ foo: 'hello' });
    expect(instance.foo).toBe('hello');
  });

  it('should apply snake_case options via setter methods', () => {
    const instance = new TestOption({ bar_baz: 'world' });
    expect(instance.barBaz).toBe('world');
  });

  it('should throw on unknown options', () => {
    expect(() => new TestOption({ unknown_key: 'val' })).toThrow(TypeError);
    expect(() => new TestOption({ unknown_key: 'val' })).toThrow('Unknown option "unknown_key" for TestOption');
  });

  it('should handle empty options', () => {
    const instance = new TestOption();
    expect(instance.getRawOptions()).toEqual({});
  });
});
