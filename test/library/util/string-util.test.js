const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const StringUtil = require(path.join(projectRoot, 'library/util/string-util'));

describe('StringUtil', () => {

  // ==================== Case Conversion ====================

  describe('lcfirst()', () => {
    test('lowercases first character', () => {
      expect(StringUtil.lcfirst('Hello')).toBe('hello');
    });

    test('handles already lowercase first character', () => {
      expect(StringUtil.lcfirst('hello')).toBe('hello');
    });

    test('handles single character', () => {
      expect(StringUtil.lcfirst('A')).toBe('a');
    });

    test('returns empty string for empty input', () => {
      expect(StringUtil.lcfirst('')).toBe('');
    });

    test('returns empty string for null', () => {
      expect(StringUtil.lcfirst(null)).toBe('');
    });

    test('returns empty string for non-string', () => {
      expect(StringUtil.lcfirst(42)).toBe('');
    });
  });

  describe('ucfirst()', () => {
    test('uppercases first character', () => {
      expect(StringUtil.ucfirst('hello')).toBe('Hello');
    });

    test('handles already uppercase first character', () => {
      expect(StringUtil.ucfirst('Hello')).toBe('Hello');
    });

    test('handles single character', () => {
      expect(StringUtil.ucfirst('a')).toBe('A');
    });

    test('returns empty string for empty input', () => {
      expect(StringUtil.ucfirst('')).toBe('');
    });

    test('returns empty string for null', () => {
      expect(StringUtil.ucfirst(null)).toBe('');
    });
  });

  describe('ucwords()', () => {
    test('capitalizes first letter of each word', () => {
      expect(StringUtil.ucwords('hello world')).toBe('Hello World');
    });

    test('handles tabs as delimiters', () => {
      expect(StringUtil.ucwords('hello\tworld')).toBe('Hello\tWorld');
    });

    test('returns empty string for empty input', () => {
      expect(StringUtil.ucwords('')).toBe('');
    });

    test('returns empty string for null', () => {
      expect(StringUtil.ucwords(null)).toBe('');
    });

    test('handles single word', () => {
      expect(StringUtil.ucwords('hello')).toBe('Hello');
    });
  });

  describe('strtolower()', () => {
    test('converts string to lowercase', () => {
      expect(StringUtil.strtolower('HELLO')).toBe('hello');
    });

    test('handles mixed case', () => {
      expect(StringUtil.strtolower('HeLLo WoRLd')).toBe('hello world');
    });

    test('converts non-string to lowercase string', () => {
      expect(StringUtil.strtolower(42)).toBe('42');
    });
  });

  describe('strtoupper()', () => {
    test('converts string to uppercase', () => {
      expect(StringUtil.strtoupper('hello')).toBe('HELLO');
    });

    test('handles mixed case', () => {
      expect(StringUtil.strtoupper('HeLLo WoRLd')).toBe('HELLO WORLD');
    });
  });

  // ==================== Case Format Conversion ====================

  describe('toCamelCase()', () => {
    test('converts kebab-case to camelCase', () => {
      expect(StringUtil.toCamelCase('hello-world')).toBe('helloWorld');
    });

    test('converts snake_case to camelCase', () => {
      expect(StringUtil.toCamelCase('hello_world')).toBe('helloWorld');
    });

    test('converts space-separated to camelCase', () => {
      expect(StringUtil.toCamelCase('hello world')).toBe('helloWorld');
    });

    test('handles multiple separators', () => {
      expect(StringUtil.toCamelCase('foo-bar_baz qux')).toBe('fooBarBazQux');
    });

    test('returns empty string for empty input', () => {
      expect(StringUtil.toCamelCase('')).toBe('');
    });

    test('returns empty string for null', () => {
      expect(StringUtil.toCamelCase(null)).toBe('');
    });
  });

  describe('toPascalCase()', () => {
    test('converts kebab-case to PascalCase', () => {
      expect(StringUtil.toPascalCase('hello-world')).toBe('HelloWorld');
    });

    test('converts snake_case to PascalCase', () => {
      expect(StringUtil.toPascalCase('hello_world')).toBe('HelloWorld');
    });

    test('returns empty string for empty input', () => {
      expect(StringUtil.toPascalCase('')).toBe('');
    });
  });

  describe('toKebabCase()', () => {
    test('converts camelCase to kebab-case', () => {
      expect(StringUtil.toKebabCase('helloWorld')).toBe('hello-world');
    });

    test('converts PascalCase to kebab-case', () => {
      expect(StringUtil.toKebabCase('HelloWorld')).toBe('hello-world');
    });

    test('converts snake_case to kebab-case', () => {
      expect(StringUtil.toKebabCase('hello_world')).toBe('hello-world');
    });

    test('converts space-separated to kebab-case', () => {
      expect(StringUtil.toKebabCase('hello world')).toBe('hello-world');
    });

    test('returns empty string for empty input', () => {
      expect(StringUtil.toKebabCase('')).toBe('');
    });

    test('returns empty string for null', () => {
      expect(StringUtil.toKebabCase(null)).toBe('');
    });
  });

  describe('toSnakeCase()', () => {
    test('converts camelCase to snake_case', () => {
      expect(StringUtil.toSnakeCase('helloWorld')).toBe('hello_world');
    });

    test('converts PascalCase to snake_case', () => {
      expect(StringUtil.toSnakeCase('HelloWorld')).toBe('hello_world');
    });

    test('converts kebab-case to snake_case', () => {
      expect(StringUtil.toSnakeCase('hello-world')).toBe('hello_world');
    });

    test('converts space-separated to snake_case', () => {
      expect(StringUtil.toSnakeCase('hello world')).toBe('hello_world');
    });

    test('returns empty string for empty input', () => {
      expect(StringUtil.toSnakeCase('')).toBe('');
    });

    test('returns empty string for null', () => {
      expect(StringUtil.toSnakeCase(null)).toBe('');
    });
  });

  describe('toConstantCase()', () => {
    test('converts camelCase to CONSTANT_CASE', () => {
      expect(StringUtil.toConstantCase('helloWorld')).toBe('HELLO_WORLD');
    });

    test('converts kebab-case to CONSTANT_CASE', () => {
      expect(StringUtil.toConstantCase('hello-world')).toBe('HELLO_WORLD');
    });

    test('returns empty string for empty input', () => {
      expect(StringUtil.toConstantCase('')).toBe('');
    });
  });

  describe('toTitleCase()', () => {
    test('converts string to Title Case', () => {
      expect(StringUtil.toTitleCase('hello world')).toBe('Hello World');
    });

    test('handles already title case', () => {
      expect(StringUtil.toTitleCase('Hello World')).toBe('Hello World');
    });

    test('handles uppercase input', () => {
      expect(StringUtil.toTitleCase('HELLO WORLD')).toBe('Hello World');
    });

    test('returns empty string for empty input', () => {
      expect(StringUtil.toTitleCase('')).toBe('');
    });

    test('returns empty string for null', () => {
      expect(StringUtil.toTitleCase(null)).toBe('');
    });
  });

  // ==================== String Manipulation ====================

  describe('strReplace()', () => {
    test('replaces all occurrences of string', () => {
      expect(StringUtil.strReplace('o', '0', 'foo bar foo')).toBe('f00 bar f00');
    });

    test('handles array of search strings', () => {
      expect(StringUtil.strReplace(['a', 'e'], 'x', 'apple')).toBe('xpplx');
    });

    test('handles array of search and replace strings', () => {
      expect(StringUtil.strReplace(['a', 'e'], ['@', '3'], 'apple')).toBe('@ppl3');
    });

    test('handles search array longer than replace array', () => {
      expect(StringUtil.strReplace(['a', 'e', 'i'], ['@', '3'], 'aeiou')).toBe('@3ou');
    });

    test('converts non-string subject', () => {
      expect(StringUtil.strReplace('a', 'b', 42)).toBe('42');
    });
  });

  describe('strrev()', () => {
    test('reverses a string', () => {
      expect(StringUtil.strrev('hello')).toBe('olleh');
    });

    test('handles single character', () => {
      expect(StringUtil.strrev('a')).toBe('a');
    });

    test('returns empty string for empty input', () => {
      expect(StringUtil.strrev('')).toBe('');
    });

    test('returns empty string for null', () => {
      expect(StringUtil.strrev(null)).toBe('');
    });
  });

  describe('strRepeat()', () => {
    test('repeats string n times', () => {
      expect(StringUtil.strRepeat('ab', 3)).toBe('ababab');
    });

    test('returns empty string for 0 count', () => {
      expect(StringUtil.strRepeat('ab', 0)).toBe('');
    });

    test('returns empty string for negative count', () => {
      expect(StringUtil.strRepeat('ab', -1)).toBe('');
    });
  });

  describe('strPad()', () => {
    test('pads on the right by default', () => {
      expect(StringUtil.strPad('hi', 5)).toBe('hi   ');
    });

    test('pads on the left', () => {
      expect(StringUtil.strPad('hi', 5, ' ', 'left')).toBe('   hi');
    });

    test('pads on both sides', () => {
      expect(StringUtil.strPad('hi', 6, '-', 'both')).toBe('--hi--');
    });

    test('uses custom pad string', () => {
      expect(StringUtil.strPad('5', 3, '0', 'left')).toBe('005');
    });

    test('returns original string if already at target length', () => {
      expect(StringUtil.strPad('hello', 5)).toBe('hello');
    });

    test('returns original string if longer than target length', () => {
      expect(StringUtil.strPad('hello world', 5)).toBe('hello world');
    });

    test('converts non-string to string', () => {
      expect(StringUtil.strPad(42, 5, '0', 'left')).toBe('00042');
    });
  });

  describe('split()', () => {
    test('splits string by delimiter', () => {
      expect(StringUtil.split(',', 'a,b,c')).toEqual(['a', 'b', 'c']);
    });

    test('splits with limit', () => {
      expect(StringUtil.split(',', 'a,b,c', 2)).toEqual(['a', 'b']);
    });

    test('returns empty array for empty input', () => {
      expect(StringUtil.split(',', '')).toEqual([]);
    });

    test('returns empty array for null input', () => {
      expect(StringUtil.split(',', null)).toEqual([]);
    });

    test('returns empty array for non-string input', () => {
      expect(StringUtil.split(',', 42)).toEqual([]);
    });
  });

  describe('join()', () => {
    test('joins array elements with glue', () => {
      expect(StringUtil.join(', ', ['a', 'b', 'c'])).toBe('a, b, c');
    });

    test('joins with empty glue', () => {
      expect(StringUtil.join('', ['a', 'b', 'c'])).toBe('abc');
    });

    test('returns empty string for non-array', () => {
      expect(StringUtil.join(', ', 'not array')).toBe('');
    });

    test('returns empty string for null', () => {
      expect(StringUtil.join(', ', null)).toBe('');
    });
  });

  // ==================== String Analysis ====================

  describe('strlen()', () => {
    test('returns string length', () => {
      expect(StringUtil.strlen('hello')).toBe(5);
    });

    test('returns 0 for empty string', () => {
      expect(StringUtil.strlen('')).toBe(0);
    });

    test('converts non-string and returns length', () => {
      expect(StringUtil.strlen(42)).toBe(2);
    });
  });

  describe('strpos()', () => {
    test('finds position of substring', () => {
      expect(StringUtil.strpos('hello world', 'world')).toBe(6);
    });

    test('finds position from offset', () => {
      expect(StringUtil.strpos('hello hello', 'hello', 1)).toBe(6);
    });

    test('returns false when not found', () => {
      expect(StringUtil.strpos('hello', 'xyz')).toBe(false);
    });

    test('finds at position 0', () => {
      expect(StringUtil.strpos('hello', 'hello')).toBe(0);
    });
  });

  describe('strrpos()', () => {
    test('finds last position of substring', () => {
      expect(StringUtil.strrpos('hello hello', 'hello')).toBe(6);
    });

    test('returns false when not found', () => {
      expect(StringUtil.strrpos('hello', 'xyz')).toBe(false);
    });

    test('finds single occurrence', () => {
      expect(StringUtil.strrpos('hello world', 'world')).toBe(6);
    });
  });

  describe('strContains()', () => {
    test('returns true when haystack contains needle', () => {
      expect(StringUtil.strContains('hello world', 'world')).toBe(true);
    });

    test('returns false when haystack does not contain needle', () => {
      expect(StringUtil.strContains('hello world', 'xyz')).toBe(false);
    });

    test('returns true for empty needle', () => {
      expect(StringUtil.strContains('hello', '')).toBe(true);
    });
  });

  describe('startsWith()', () => {
    test('returns true when string starts with prefix', () => {
      expect(StringUtil.startsWith('hello world', 'hello')).toBe(true);
    });

    test('returns false when string does not start with prefix', () => {
      expect(StringUtil.startsWith('hello world', 'world')).toBe(false);
    });

    test('returns true for empty prefix', () => {
      expect(StringUtil.startsWith('hello', '')).toBe(true);
    });
  });

  describe('endsWith()', () => {
    test('returns true when string ends with suffix', () => {
      expect(StringUtil.endsWith('hello world', 'world')).toBe(true);
    });

    test('returns false when string does not end with suffix', () => {
      expect(StringUtil.endsWith('hello world', 'hello')).toBe(false);
    });

    test('returns true for empty suffix', () => {
      expect(StringUtil.endsWith('hello', '')).toBe(true);
    });
  });

  // ==================== String Trimming ====================

  describe('trim()', () => {
    test('trims whitespace from both ends', () => {
      expect(StringUtil.trim('  hello  ')).toBe('hello');
    });

    test('trims custom characters', () => {
      expect(StringUtil.trim('xxhelloxx', 'x')).toBe('hello');
    });

    test('handles no whitespace', () => {
      expect(StringUtil.trim('hello')).toBe('hello');
    });

    test('trims tabs and newlines', () => {
      expect(StringUtil.trim('\t\nhello\n\t')).toBe('hello');
    });
  });

  describe('ltrim()', () => {
    test('trims whitespace from left', () => {
      expect(StringUtil.ltrim('  hello  ')).toBe('hello  ');
    });

    test('trims custom characters from left', () => {
      expect(StringUtil.ltrim('xxhelloxx', 'x')).toBe('helloxx');
    });
  });

  describe('rtrim()', () => {
    test('trims whitespace from right', () => {
      expect(StringUtil.rtrim('  hello  ')).toBe('  hello');
    });

    test('trims custom characters from right', () => {
      expect(StringUtil.rtrim('xxhelloxx', 'x')).toBe('xxhello');
    });
  });

  // ==================== Substring Operations ====================

  describe('substr()', () => {
    test('extracts from start position', () => {
      expect(StringUtil.substr('hello world', 6)).toBe('world');
    });

    test('extracts with length', () => {
      expect(StringUtil.substr('hello world', 0, 5)).toBe('hello');
    });

    test('handles negative start', () => {
      expect(StringUtil.substr('hello world', -5)).toBe('world');
    });

    test('handles negative length', () => {
      expect(StringUtil.substr('hello world', 0, -6)).toBe('hello');
    });

    test('extracts from middle with length', () => {
      expect(StringUtil.substr('hello world', 3, 4)).toBe('lo w');
    });
  });

  describe('substrCount()', () => {
    test('counts occurrences of substring', () => {
      expect(StringUtil.substrCount('hello hello hello', 'hello')).toBe(3);
    });

    test('returns 0 when not found', () => {
      expect(StringUtil.substrCount('hello', 'xyz')).toBe(0);
    });

    test('returns 0 for empty needle', () => {
      expect(StringUtil.substrCount('hello', '')).toBe(0);
    });

    test('counts single character', () => {
      expect(StringUtil.substrCount('banana', 'a')).toBe(3);
    });

    test('counts non-overlapping occurrences', () => {
      expect(StringUtil.substrCount('aaa', 'aa')).toBe(1);
    });
  });

  // ==================== HTML Methods ====================

  describe('htmlSpecialChars()', () => {
    test('escapes HTML special characters', () => {
      expect(StringUtil.htmlSpecialChars('<p class="test">Hello & \'World\'</p>'))
        .toBe('&lt;p class=&quot;test&quot;&gt;Hello &amp; &#039;World&#039;&lt;/p&gt;');
    });

    test('handles string without special characters', () => {
      expect(StringUtil.htmlSpecialChars('hello')).toBe('hello');
    });

    test('handles empty string', () => {
      expect(StringUtil.htmlSpecialChars('')).toBe('');
    });
  });

  describe('htmlEntityDecode()', () => {
    test('decodes HTML entities', () => {
      expect(StringUtil.htmlEntityDecode('&lt;p&gt;Hello &amp; &#039;World&#039;&lt;/p&gt;'))
        .toBe("<p>Hello & 'World'</p>");
    });

    test('handles string without entities', () => {
      expect(StringUtil.htmlEntityDecode('hello')).toBe('hello');
    });

    test('decodes &quot;', () => {
      expect(StringUtil.htmlEntityDecode('&quot;test&quot;')).toBe('"test"');
    });
  });

  describe('stripTags()', () => {
    test('strips all HTML tags', () => {
      expect(StringUtil.stripTags('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });

    test('allows specific tags', () => {
      const result = StringUtil.stripTags('<p>Hello <b>World</b></p>', '<p>');
      expect(result).toBe('<p>Hello World</p>');
    });

    test('allows multiple tags', () => {
      const result = StringUtil.stripTags('<p>Hello <b>World</b> <a href="#">link</a></p>', '<p><a>');
      expect(result).toBe('<p>Hello World <a href="#">link</a></p>');
    });

    test('handles string without tags', () => {
      expect(StringUtil.stripTags('hello world')).toBe('hello world');
    });

    test('handles empty string', () => {
      expect(StringUtil.stripTags('')).toBe('');
    });
  });

  // ==================== Truncate & Slugify ====================

  describe('truncate()', () => {
    test('truncates long string with default suffix', () => {
      expect(StringUtil.truncate('Hello World, this is a long string', 15)).toBe('Hello World,...');
    });

    test('does not truncate short string', () => {
      expect(StringUtil.truncate('Hello', 10)).toBe('Hello');
    });

    test('uses custom suffix', () => {
      expect(StringUtil.truncate('Hello World, this is a long string', 15, '---')).toBe('Hello World,---');
    });

    test('handles exact length', () => {
      expect(StringUtil.truncate('Hello', 5)).toBe('Hello');
    });
  });

  describe('truncateWords()', () => {
    test('truncates at word boundary', () => {
      const result = StringUtil.truncateWords('Hello World, this is a long string', 20);
      expect(result).toContain('...');
      expect(result.length).toBeLessThanOrEqual(20);
    });

    test('does not truncate short string', () => {
      expect(StringUtil.truncateWords('Hello', 10)).toBe('Hello');
    });

    test('uses custom suffix', () => {
      const result = StringUtil.truncateWords('Hello World, this is long', 18, '---');
      expect(result).toContain('---');
    });
  });

  describe('slugify()', () => {
    test('creates URL-friendly slug', () => {
      expect(StringUtil.slugify('Hello World!')).toBe('hello-world');
    });

    test('handles special characters', () => {
      expect(StringUtil.slugify('This is a test! @#$%')).toBe('this-is-a-test');
    });

    test('handles multiple spaces', () => {
      expect(StringUtil.slugify('hello   world')).toBe('hello-world');
    });

    test('uses custom separator', () => {
      expect(StringUtil.slugify('Hello World', '_')).toBe('hello_world');
    });

    test('handles leading and trailing separators', () => {
      expect(StringUtil.slugify(' Hello World ')).toBe('hello-world');
    });
  });

  describe('random()', () => {
    test('generates string of specified length', () => {
      expect(StringUtil.random(10).length).toBe(10);
    });

    test('generates default length of 16', () => {
      expect(StringUtil.random().length).toBe(16);
    });

    test('uses custom character set', () => {
      const result = StringUtil.random(100, 'abc');
      expect(result).toMatch(/^[abc]+$/);
    });

    test('generates different strings on successive calls', () => {
      const a = StringUtil.random(32);
      const b = StringUtil.random(32);
      expect(a).not.toBe(b);
    });
  });

  describe('toCamelCase trailing separator (line 82)', () => {
    test('handles trailing hyphen without error', () => {
      expect(StringUtil.toCamelCase('hello-')).toBe('hello');
    });

    test('handles trailing underscore without error', () => {
      expect(StringUtil.toCamelCase('hello_')).toBe('hello');
    });

    test('handles trailing space without error', () => {
      expect(StringUtil.toCamelCase('hello ')).toBe('hello');
    });
  });

  describe('stripTags with allowedTags (line 467)', () => {
    test('strips non-allowed tags and keeps allowed ones', () => {
      const result = StringUtil.stripTags('<b>bold</b><i>italic</i>', '<b>');
      expect(result).toContain('<b>');
      expect(result).toContain('</b>');
      expect(result).not.toContain('<i>');
      expect(result).toContain('italic');
    });
  });

  describe('truncate with word boundary (line 499)', () => {
    test('truncateWords truncates at last space when lastSpace > 0', () => {
      const result = StringUtil.truncateWords('hello world foo bar', 16);
      expect(result).toContain('...');
      const lastSpace = 'hello world f'.lastIndexOf(' ');
      expect(lastSpace).toBeGreaterThan(0);
    });

    test('truncateWords truncates at word boundary', () => {
      const result = StringUtil.truncateWords('hello world foo bar baz', 18);
      expect(result.endsWith('...')).toBe(true);
      // truncated to 15 chars = "hello world foo", lastSpace=11, so "hello world..."
      expect(result).toBe('hello world...');
    });
  });

  describe('stripTags allowedTags regex fallback (line 467)', () => {
    test('handles allowedTags with no regex matches (empty string)', () => {
      // Pass an allowedTags string that doesn't match the regex pattern
      const result = StringUtil.stripTags('<b>bold</b>', '');
      // Empty string has no tag matches, so `allowed` will be `|| []` (empty array)
      expect(result).toBe('bold');
    });

    test('handles allowedTags with no valid tag patterns', () => {
      // Pass a string that won't match the <tag pattern
      const result = StringUtil.stripTags('<b>bold</b><i>italic</i>', 'notag');
      expect(result).toBe('bolditalic');
    });
  });

  describe('truncateWords no space found (line 499)', () => {
    test('truncates without word boundary when no space in truncated portion', () => {
      // A long single word with no spaces - lastSpace will be -1 (not > 0)
      const result = StringUtil.truncateWords('abcdefghijklmnopqrstuvwxyz', 10);
      // length=10, suffix='...' (3 chars), so slice(0, 7) = 'abcdefg', no space found
      expect(result).toBe('abcdefg...');
    });
  });

  describe('escapeRegex()', () => {
    test('escapes regex special characters', () => {
      expect(StringUtil.escapeRegex('hello.world')).toBe('hello\\.world');
    });

    test('escapes all special characters', () => {
      const result = StringUtil.escapeRegex('.*+?^${}()|[]\\');
      expect(result).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    test('returns plain string unchanged', () => {
      expect(StringUtil.escapeRegex('hello')).toBe('hello');
    });
  });

});
