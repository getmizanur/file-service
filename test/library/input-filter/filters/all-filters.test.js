const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const fs = require('fs');
const filterDir = path.join(projectRoot, 'library/input-filter/filters');
const filterFiles = fs.readdirSync(filterDir).filter(f => f.endsWith('.js') && !f.includes('stub'));

describe('Input Filter Filters', () => {
  filterFiles.forEach(file => {
    const FilterClass = require(path.join(filterDir, file));
    const name = FilterClass.name || file;

    describe(name, () => {
      // Special handling for filters requiring constructor options
      if (file === 'callback.js') {
        it('should throw without callback option', () => {
          expect(() => new FilterClass()).toThrow();
        });

        it('should apply callback', () => {
          const filter = new FilterClass({ callback: v => v.toUpperCase() });
          expect(filter.filter('hello')).toBe('HELLO');
        });
        return;
      }

      if (file === 'preg-replace.js') {
        it('should throw without pattern option', () => {
          expect(() => new FilterClass()).toThrow();
        });

        it('should replace pattern', () => {
          const filter = new FilterClass({ pattern: /[0-9]/g, replacement: '' });
          expect(filter.filter('abc123')).toBe('abc');
        });

        it('should accept string pattern', () => {
          const filter = new FilterClass({ pattern: '\\d+', replacement: 'X' });
          expect(filter.filter('abc123')).toBe('abcX');
        });

        it('should default replacement to empty string', () => {
          const filter = new FilterClass({ pattern: /x/g });
          expect(filter.filter('xax')).toBe('a');
        });

        it('should convert non-string values to string before filtering', () => {
          const filter = new FilterClass({ pattern: /2/g, replacement: '' });
          expect(filter.filter(123)).toBe('13');
          expect(filter.filter(null)).toBe('null');
        });
        return;
      }

      it('should be constructable', () => {
        const filter = new FilterClass();
        expect(filter).toBeDefined();
      });

      it('should have filter method', () => {
        const filter = new FilterClass();
        expect(typeof filter.filter).toBe('function');
      });

      it('should handle string input', () => {
        const filter = new FilterClass();
        const result = filter.filter('test');
        expect(result).toBeDefined();
      });

      // Some filters (e.g. StripTags) don't coerce non-string input
      const skipNonString = ['strip-tags.js'];
      if (!skipNonString.includes(file)) {
        it('should handle non-string input', () => {
          const filter = new FilterClass();
          expect(() => filter.filter(123)).not.toThrow();
        });
      }
    });
  });
});

// Separator filter branch coverage
describe('CamelCaseToSeparator - branch coverage', () => {
  const CamelCaseToSeparator = require(path.join(filterDir, 'camel-case-to-separator'));

  it('should use custom separator when provided (line 26 false branch)', () => {
    const filter = new CamelCaseToSeparator({ separator: '_' });
    expect(filter.separator).toBe('_');
    expect(filter.filter('camelCase')).toBe('camel_case');
  });

  it('should use empty string separator when explicitly set', () => {
    const filter = new CamelCaseToSeparator({ separator: '' });
    expect(filter.separator).toBe('');
  });
});

describe('DashToSeparator - branch coverage', () => {
  const DashToSeparator = require(path.join(filterDir, 'dash-to-separator'));

  it('should use custom separator when provided (line 26 false branch)', () => {
    const filter = new DashToSeparator({ separator: '_' });
    expect(filter.separator).toBe('_');
    expect(filter.filter('my-name')).toBe('my_name');
  });

  it('should use empty string separator when explicitly set', () => {
    const filter = new DashToSeparator({ separator: '' });
    expect(filter.separator).toBe('');
  });
});

// Specific filter tests
describe('Specific filter behavior', () => {
  const StringToLower = require(path.join(filterDir, 'string-to-lower'));
  const StringToUpper = require(path.join(filterDir, 'string-to-upper'));
  const StringTrim = require(path.join(filterDir, 'string-trim'));
  const Integer = require(path.join(filterDir, 'integer'));
  const BooleanFilter = require(path.join(filterDir, 'boolean'));
  const Alnum = require(path.join(filterDir, 'alnum'));
  const Alpha = require(path.join(filterDir, 'alpha'));
  const CamelCaseToDash = require(path.join(filterDir, 'camel-case-to-dash'));
  const DashToUnderscore = require(path.join(filterDir, 'dash-to-underscore'));

  it('StringToLower converts to lowercase', () => {
    expect(new StringToLower().filter('HELLO')).toBe('hello');
  });

  it('StringToUpper converts to uppercase', () => {
    expect(new StringToUpper().filter('hello')).toBe('HELLO');
  });

  it('StringTrim trims whitespace', () => {
    expect(new StringTrim().filter('  hello  ')).toBe('hello');
  });

  it('Integer parses integer', () => {
    expect(new Integer().filter('42')).toBe(42);
    expect(new Integer().filter('not-a-number')).toBe(0);
  });

  it('Boolean handles various truthy/falsy', () => {
    const f = new BooleanFilter();
    expect(f.filter(true)).toBe('1');
    expect(f.filter('1')).toBe('1');
    expect(f.filter('on')).toBe('1');
    expect(f.filter(false)).toBe('0');
    expect(f.filter('0')).toBe('0');
    expect(f.filter(null)).toBe('0');
    expect(f.filter(['0', '1'])).toBe('1');
    expect(f.filter(['0'])).toBe('0');
  });

  it('Alnum strips non-alphanumeric', () => {
    expect(new Alnum().filter('hello-world_123!')).toBe('helloworld123');
  });

  it('Alpha strips non-alpha', () => {
    expect(new Alpha().filter('hello123')).toBe('hello');
  });

  it('CamelCaseToDash converts', () => {
    expect(new CamelCaseToDash().filter('camelCase')).toBe('camel-case');
  });

  it('DashToUnderscore converts', () => {
    expect(new DashToUnderscore().filter('my-name')).toBe('my_name');
  });
});
