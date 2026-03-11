const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const StringUtil = require(path.join(projectRoot, 'library/util/string-util'));

describe('StringUtil', () => {

  // ==================== Case Conversion ====================

  describe('lcfirst', () => {
    it('should lowercase first character', () => {
      expect(StringUtil.lcfirst('Hello')).toBe('hello');
      expect(StringUtil.lcfirst('WORLD')).toBe('wORLD');
    });
    it('should return empty string for falsy/non-string', () => {
      expect(StringUtil.lcfirst('')).toBe('');
      expect(StringUtil.lcfirst(null)).toBe('');
      expect(StringUtil.lcfirst(undefined)).toBe('');
      expect(StringUtil.lcfirst(123)).toBe('');
    });
  });

  describe('ucfirst', () => {
    it('should uppercase first character', () => {
      expect(StringUtil.ucfirst('hello')).toBe('Hello');
      expect(StringUtil.ucfirst('world')).toBe('World');
    });
    it('should return empty string for falsy/non-string', () => {
      expect(StringUtil.ucfirst('')).toBe('');
      expect(StringUtil.ucfirst(null)).toBe('');
      expect(StringUtil.ucfirst(undefined)).toBe('');
      expect(StringUtil.ucfirst(42)).toBe('');
    });
  });

  describe('ucwords', () => {
    it('should uppercase first letter of each word', () => {
      expect(StringUtil.ucwords('hello world')).toBe('Hello World');
      expect(StringUtil.ucwords('foo bar baz')).toBe('Foo Bar Baz');
    });
    it('should handle custom delimiters', () => {
      expect(StringUtil.ucwords('hello-world', '-')).toBe('Hello-World');
    });
    it('should return empty string for falsy/non-string', () => {
      expect(StringUtil.ucwords('')).toBe('');
      expect(StringUtil.ucwords(null)).toBe('');
      expect(StringUtil.ucwords(42)).toBe('');
    });
  });

  describe('strtolower', () => {
    it('should convert to lowercase', () => {
      expect(StringUtil.strtolower('HELLO')).toBe('hello');
      expect(StringUtil.strtolower('Hello World')).toBe('hello world');
    });
    it('should handle non-string input', () => {
      expect(StringUtil.strtolower(123)).toBe('123');
    });
  });

  describe('strtoupper', () => {
    it('should convert to uppercase', () => {
      expect(StringUtil.strtoupper('hello')).toBe('HELLO');
    });
    it('should handle non-string input', () => {
      expect(StringUtil.strtoupper(123)).toBe('123');
    });
  });

  // ==================== Case Format Conversion ====================

  describe('toCamelCase', () => {
    it('should convert hyphenated to camelCase', () => {
      expect(StringUtil.toCamelCase('hello-world')).toBe('helloWorld');
    });
    it('should convert underscored to camelCase', () => {
      expect(StringUtil.toCamelCase('hello_world')).toBe('helloWorld');
    });
    it('should convert spaced to camelCase', () => {
      expect(StringUtil.toCamelCase('hello world')).toBe('helloWorld');
    });
    it('should return empty for falsy/non-string', () => {
      expect(StringUtil.toCamelCase('')).toBe('');
      expect(StringUtil.toCamelCase(null)).toBe('');
    });
    it('should handle trailing separator producing empty char (branch line 82)', () => {
      // Trailing '-' means the capture group (.?) captures nothing (undefined/empty)
      expect(StringUtil.toCamelCase('hello-')).toBe('hello');
    });
  });

  describe('toPascalCase', () => {
    it('should convert to PascalCase', () => {
      expect(StringUtil.toPascalCase('hello-world')).toBe('HelloWorld');
      expect(StringUtil.toPascalCase('hello_world')).toBe('HelloWorld');
    });
  });

  describe('toKebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(StringUtil.toKebabCase('helloWorld')).toBe('hello-world');
      expect(StringUtil.toKebabCase('HelloWorld')).toBe('hello-world');
    });
    it('should convert spaces/underscores to hyphens', () => {
      expect(StringUtil.toKebabCase('hello_world')).toBe('hello-world');
      expect(StringUtil.toKebabCase('hello world')).toBe('hello-world');
    });
    it('should return empty for falsy/non-string', () => {
      expect(StringUtil.toKebabCase('')).toBe('');
      expect(StringUtil.toKebabCase(null)).toBe('');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(StringUtil.toSnakeCase('helloWorld')).toBe('hello_world');
      expect(StringUtil.toSnakeCase('HelloWorld')).toBe('hello_world');
    });
    it('should convert hyphens/spaces to underscores', () => {
      expect(StringUtil.toSnakeCase('hello-world')).toBe('hello_world');
      expect(StringUtil.toSnakeCase('hello world')).toBe('hello_world');
    });
    it('should return empty for falsy/non-string', () => {
      expect(StringUtil.toSnakeCase('')).toBe('');
      expect(StringUtil.toSnakeCase(null)).toBe('');
    });
  });

  describe('toConstantCase', () => {
    it('should convert to CONSTANT_CASE', () => {
      expect(StringUtil.toConstantCase('helloWorld')).toBe('HELLO_WORLD');
      expect(StringUtil.toConstantCase('hello-world')).toBe('HELLO_WORLD');
    });
  });

  describe('toTitleCase', () => {
    it('should convert to Title Case', () => {
      expect(StringUtil.toTitleCase('hello world')).toBe('Hello World');
    });
    it('should return empty for falsy/non-string', () => {
      expect(StringUtil.toTitleCase('')).toBe('');
      expect(StringUtil.toTitleCase(null)).toBe('');
    });
  });

  // ==================== String Manipulation ====================

  describe('strReplace', () => {
    it('should replace string occurrences', () => {
      expect(StringUtil.strReplace('world', 'earth', 'hello world')).toBe('hello earth');
    });
    it('should handle array search with string replace', () => {
      expect(StringUtil.strReplace(['a', 'b'], 'x', 'abc')).toBe('xxc');
    });
    it('should handle array search with array replace', () => {
      expect(StringUtil.strReplace(['a', 'b'], ['x', 'y'], 'abc')).toBe('xyc');
    });
    it('should handle array search with shorter replace array', () => {
      expect(StringUtil.strReplace(['a', 'b'], ['x'], 'abc')).toBe('xc');
    });
    it('should handle array replace for non-array search', () => {
      expect(StringUtil.strReplace('a', ['x', 'y'], 'abc')).toBe('x,ybc');
    });
    it('should handle empty replace array for non-array search (branch line 166)', () => {
      expect(StringUtil.strReplace('a', [], 'abc')).toBe('bc');
    });
    it('should return string conversion for non-string subject', () => {
      expect(StringUtil.strReplace('a', 'b', 123)).toBe('123');
    });
  });

  describe('strrev', () => {
    it('should reverse a string', () => {
      expect(StringUtil.strrev('hello')).toBe('olleh');
    });
    it('should return empty for falsy/non-string', () => {
      expect(StringUtil.strrev('')).toBe('');
      expect(StringUtil.strrev(null)).toBe('');
    });
  });

  describe('strRepeat', () => {
    it('should repeat a string', () => {
      expect(StringUtil.strRepeat('ab', 3)).toBe('ababab');
    });
    it('should handle zero or negative count', () => {
      expect(StringUtil.strRepeat('ab', 0)).toBe('');
      expect(StringUtil.strRepeat('ab', -1)).toBe('');
    });
  });

  describe('strPad', () => {
    it('should pad right by default', () => {
      expect(StringUtil.strPad('hi', 5)).toBe('hi   ');
    });
    it('should pad left', () => {
      expect(StringUtil.strPad('hi', 5, '0', 'left')).toBe('000hi');
    });
    it('should pad both sides', () => {
      expect(StringUtil.strPad('hi', 6, '-', 'both')).toBe('--hi--');
    });
    it('should return original string when already long enough', () => {
      expect(StringUtil.strPad('hello', 3)).toBe('hello');
    });
    it('should handle non-string input', () => {
      expect(StringUtil.strPad(42, 5, '0', 'left')).toBe('00042');
    });
  });

  describe('split', () => {
    it('should split string by delimiter', () => {
      expect(StringUtil.split(',', 'a,b,c')).toEqual(['a', 'b', 'c']);
    });
    it('should respect limit', () => {
      expect(StringUtil.split(',', 'a,b,c', 2)).toEqual(['a', 'b']);
    });
    it('should return empty array for falsy/non-string', () => {
      expect(StringUtil.split(',', '')).toEqual([]);
      expect(StringUtil.split(',', null)).toEqual([]);
    });
  });

  describe('join', () => {
    it('should join array elements', () => {
      expect(StringUtil.join('-', ['a', 'b', 'c'])).toBe('a-b-c');
    });
    it('should return empty string for non-array', () => {
      expect(StringUtil.join('-', 'not array')).toBe('');
    });
  });

  // ==================== String Analysis ====================

  describe('strlen', () => {
    it('should return string length', () => {
      expect(StringUtil.strlen('hello')).toBe(5);
    });
    it('should handle non-string', () => {
      expect(StringUtil.strlen(123)).toBe(3);
    });
  });

  describe('strpos', () => {
    it('should find position of substring', () => {
      expect(StringUtil.strpos('hello world', 'world')).toBe(6);
    });
    it('should return false when not found', () => {
      expect(StringUtil.strpos('hello', 'xyz')).toBe(false);
    });
    it('should respect offset', () => {
      expect(StringUtil.strpos('abcabc', 'abc', 1)).toBe(3);
    });
  });

  describe('strrpos', () => {
    it('should find last position of substring', () => {
      expect(StringUtil.strrpos('abcabc', 'abc')).toBe(3);
    });
    it('should return false when not found', () => {
      expect(StringUtil.strrpos('hello', 'xyz')).toBe(false);
    });
  });

  describe('strContains', () => {
    it('should return true when contains', () => {
      expect(StringUtil.strContains('hello world', 'world')).toBe(true);
    });
    it('should return false when not contains', () => {
      expect(StringUtil.strContains('hello', 'xyz')).toBe(false);
    });
  });

  describe('startsWith', () => {
    it('should check prefix', () => {
      expect(StringUtil.startsWith('hello world', 'hello')).toBe(true);
      expect(StringUtil.startsWith('hello world', 'world')).toBe(false);
    });
  });

  describe('endsWith', () => {
    it('should check suffix', () => {
      expect(StringUtil.endsWith('hello world', 'world')).toBe(true);
      expect(StringUtil.endsWith('hello world', 'hello')).toBe(false);
    });
  });

  // ==================== String Trimming ====================

  describe('trim', () => {
    it('should trim whitespace by default', () => {
      expect(StringUtil.trim('  hello  ')).toBe('hello');
    });
    it('should trim custom characters', () => {
      expect(StringUtil.trim('--hello--', '-')).toBe('hello');
    });
    it('should handle non-string input', () => {
      expect(StringUtil.trim(123)).toBe('123');
    });
  });

  describe('ltrim', () => {
    it('should trim left whitespace by default', () => {
      expect(StringUtil.ltrim('  hello  ')).toBe('hello  ');
    });
    it('should trim left custom characters', () => {
      expect(StringUtil.ltrim('--hello', '-')).toBe('hello');
    });
  });

  describe('rtrim', () => {
    it('should trim right whitespace by default', () => {
      expect(StringUtil.rtrim('  hello  ')).toBe('  hello');
    });
    it('should trim right custom characters', () => {
      expect(StringUtil.rtrim('hello--', '-')).toBe('hello');
    });
  });

  // ==================== Substring Operations ====================

  describe('substr', () => {
    it('should extract substring from start', () => {
      expect(StringUtil.substr('hello', 1)).toBe('ello');
    });
    it('should extract substring with length', () => {
      expect(StringUtil.substr('hello', 1, 3)).toBe('ell');
    });
    it('should handle negative length', () => {
      expect(StringUtil.substr('hello', 0, -1)).toBe('hell');
    });
  });

  describe('substrCount', () => {
    it('should count substring occurrences', () => {
      expect(StringUtil.substrCount('hello world hello', 'hello')).toBe(2);
    });
    it('should return 0 for empty needle', () => {
      expect(StringUtil.substrCount('hello', '')).toBe(0);
    });
    it('should return 0 when not found', () => {
      expect(StringUtil.substrCount('hello', 'xyz')).toBe(0);
    });
  });

  // ==================== Utility Methods ====================

  describe('escapeRegex', () => {
    it('should escape regex special characters', () => {
      expect(StringUtil.escapeRegex('hello.world')).toBe('hello\\.world');
      expect(StringUtil.escapeRegex('(test)')).toBe('\\(test\\)');
    });
  });

  describe('htmlSpecialChars', () => {
    it('should escape HTML special characters', () => {
      expect(StringUtil.htmlSpecialChars('<div class="test">&</div>')).toBe(
        '&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;'
      );
    });
    it('should escape single quotes', () => {
      expect(StringUtil.htmlSpecialChars("it's")).toBe("it&#039;s");
    });
  });

  describe('htmlEntityDecode', () => {
    it('should decode HTML entities', () => {
      expect(StringUtil.htmlEntityDecode('&lt;div&gt;&amp;&lt;/div&gt;')).toBe('<div>&</div>');
    });
    it('should decode quotes', () => {
      expect(StringUtil.htmlEntityDecode('&quot;test&quot;')).toBe('"test"');
      expect(StringUtil.htmlEntityDecode('&#039;test&#039;')).toBe("'test'");
    });
  });

  describe('stripTags', () => {
    it('should strip all tags', () => {
      expect(StringUtil.stripTags('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });
    it('should allow specified tags', () => {
      expect(StringUtil.stripTags('<p>Hello <b>World</b></p>', '<p>')).toBe('<p>Hello World</p>');
    });
    it('should handle self-closing tags', () => {
      expect(StringUtil.stripTags('text<br/>more')).toBe('textmore');
    });
    it('should handle allowedTags with no match in regex (branch line 468)', () => {
      // allowedTags string that has no valid tag names matching /<\/?(\w+)/g
      const result = StringUtil.stripTags('<p>Hello</p>', '<<>>');
      // The regex match returns null so allowed becomes [] via || []
      expect(result).toBe('Hello');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(StringUtil.truncate('hello world', 8)).toBe('hello...');
    });
    it('should not truncate short strings', () => {
      expect(StringUtil.truncate('hello', 10)).toBe('hello');
    });
    it('should use custom suffix', () => {
      expect(StringUtil.truncate('hello world', 8, '…')).toBe('hello w…');
    });
  });

  describe('truncateWords', () => {
    it('should truncate at word boundary', () => {
      expect(StringUtil.truncateWords('hello wonderful world', 15)).toBe('hello...');
    });
    it('should not truncate short strings', () => {
      expect(StringUtil.truncateWords('hello', 10)).toBe('hello');
    });
    it('should truncate mid-word if no space found', () => {
      expect(StringUtil.truncateWords('superlongword', 8)).toBe('super...');
    });
  });

  describe('slugify', () => {
    it('should create URL-friendly slug', () => {
      expect(StringUtil.slugify('Hello World!')).toBe('hello-world');
    });
    it('should handle custom separator', () => {
      expect(StringUtil.slugify('Hello World', '_')).toBe('hello_world');
    });
    it('should strip leading/trailing separators', () => {
      expect(StringUtil.slugify('--Hello--')).toBe('hello');
    });
  });

  describe('random', () => {
    it('should generate string of specified length', () => {
      const r = StringUtil.random(10);
      expect(r).toHaveLength(10);
    });
    it('should default to length 16', () => {
      expect(StringUtil.random()).toHaveLength(16);
    });
    it('should use custom character set', () => {
      const r = StringUtil.random(10, '0123456789');
      expect(r).toMatch(/^\d{10}$/);
    });
  });
});
