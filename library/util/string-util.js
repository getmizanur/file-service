/**
 * String Utility Class
 * Provides PHP-inspired string manipulation and formatting utilities
 * for JavaScript/Node.js applications
 */
class StringUtil {

  // ==================== Case Conversion ====================

  /**
   * Make first character lowercase
   * Similar to PHP's lcfirst()
   * @param {string} str - String to convert
   * @returns {string}
   */
  static lcfirst(str) {
    if(!str || typeof str !== 'string') return '';
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Make first character uppercase
   * Similar to PHP's ucfirst()
   * @param {string} str - String to convert
   * @returns {string}
   */
  static ucfirst(str) {
    if(!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Uppercase first character of each word
   * Similar to PHP's ucwords()
   * @param {string} str - String to convert
   * @param {string} delimiters - Word delimiters (default: space and tab)
   * @returns {string}
   */
  static ucwords(str, delimiters = ' \t\r\n\f\v') {
    if(!str || typeof str !== 'string') return '';

    const delimiterPattern = delimiters.split('').map(d => {
      return d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('|');

    const regex = new RegExp(`(^|[${delimiterPattern}])([a-z\u00E0-\u00FC])`, 'g');
    return str.replace(regex, (match) => match.toUpperCase());
  }

  /**
   * Convert string to lowercase
   * Similar to PHP's strtolower()
   * @param {string} str - String to convert
   * @returns {string}
   */
  static strtolower(str) {
    return String(str).toLowerCase();
  }

  /**
   * Convert string to uppercase
   * Similar to PHP's strtoupper()
   * @param {string} str - String to convert
   * @returns {string}
   */
  static strtoupper(str) {
    return String(str).toUpperCase();
  }

  // ==================== Case Format Conversion ====================

  /**
   * Convert string to camelCase
   * Examples: 'hello-world' -> 'helloWorld', 'hello_world' -> 'helloWorld'
   * @param {string} str - String to convert
   * @returns {string}
   */
  static toCamelCase(str) {
    if(!str || typeof str !== 'string') return '';
    return str.toLowerCase()
      .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
  }

  /**
   * Convert string to PascalCase
   * Examples: 'hello-world' -> 'HelloWorld', 'hello_world' -> 'HelloWorld'
   * @param {string} str - String to convert
   * @returns {string}
   */
  static toPascalCase(str) {
    return this.ucfirst(this.toCamelCase(str));
  }

  /**
   * Convert string to kebab-case (hyphenated lowercase)
   * Examples: 'HelloWorld' -> 'hello-world', 'helloWorld' -> 'hello-world'
   * @param {string} str - String to convert
   * @returns {string}
   */
  static toKebabCase(str) {
    if(!str || typeof str !== 'string') return '';
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Convert string to snake_case (underscored lowercase)
   * Examples: 'HelloWorld' -> 'hello_world', 'helloWorld' -> 'hello_world'
   * @param {string} str - String to convert
   * @returns {string}
   */
  static toSnakeCase(str) {
    if(!str || typeof str !== 'string') return '';
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  }

  /**
   * Convert string to CONSTANT_CASE (uppercase snake_case)
   * Examples: 'HelloWorld' -> 'HELLO_WORLD', 'helloWorld' -> 'HELLO_WORLD'
   * @param {string} str - String to convert
   * @returns {string}
   */
  static toConstantCase(str) {
    return this.toSnakeCase(str).toUpperCase();
  }

  /**
   * Convert string to Title Case
   * Examples: 'hello world' -> 'Hello World'
   * @param {string} str - String to convert
   * @returns {string}
   */
  static toTitleCase(str) {
    if(!str || typeof str !== 'string') return '';
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  }

  // ==================== String Manipulation ====================

  /**
   * Replace all occurrences of search with replace
   * Similar to PHP's str_replace()
   * @param {string|Array} search - String(s) to search for
   * @param {string|Array} replace - Replacement string(s)
   * @param {string} subject - String to perform replacements on
   * @returns {string}
   */
  static strReplace(search, replace, subject) {
    if(typeof subject !== 'string') return String(subject);

    if(Array.isArray(search)) {
      let result = subject;
      for(let i = 0; i < search.length; i++) {
        const replaceVal = Array.isArray(replace) ? (replace[i] || '') : replace;
        result = result.split(search[i]).join(replaceVal);
      }
      return result;
    }

    return subject.split(search).join(replace);
  }

  /**
   * Reverse a string
   * Similar to PHP's strrev()
   * @param {string} str - String to reverse
   * @returns {string}
   */
  static strrev(str) {
    if(!str || typeof str !== 'string') return '';
    return str.split('').reverse().join('');
  }

  /**
   * Repeat a string
   * Similar to PHP's str_repeat()
   * @param {string} str - String to repeat
   * @param {number} count - Number of times to repeat
   * @returns {string}
   */
  static strRepeat(str, count) {
    return str.repeat(Math.max(0, count));
  }

  /**
   * Pad string to certain length with another string
   * Similar to PHP's str_pad()
   * @param {string} str - String to pad
   * @param {number} length - Target length
   * @param {string} padString - String to pad with (default: space)
   * @param {string} type - 'left', 'right', or 'both' (default: 'right')
   * @returns {string}
   */
  static strPad(str, length, padString = ' ', type = 'right') {
    str = String(str);
    const padLength = length - str.length;

    if(padLength <= 0) return str;

    const pad = padString.repeat(Math.ceil(padLength / padString.length));

    switch(type) {
      case 'left':
        return (pad + str).slice(-length);
      case 'both':
        const leftPad = Math.floor(padLength / 2);
        const rightPad = padLength - leftPad;
        return pad.slice(0, leftPad) + str + pad.slice(0, rightPad);
      case 'right':
      default:
        return (str + pad).slice(0, length);
    }
  }

  /**
   * Split string by delimiter
   * Similar to PHP's explode()
   * @param {string} delimiter - Delimiter to split by
   * @param {string} string - String to split
   * @param {number} limit - Maximum number of splits (optional)
   * @returns {Array}
   */
  static split(delimiter, string, limit = undefined) {
    if(!string || typeof string !== 'string') return [];
    return limit !== undefined ? string.split(delimiter, limit) : string.split(delimiter);
  }

  /**
   * Join array elements with a string
   * Similar to PHP's implode()
   * @param {string} glue - Glue string
   * @param {Array} pieces - Array to join
   * @returns {string}
   */
  static join(glue, pieces) {
    if(!Array.isArray(pieces)) return '';
    return pieces.join(glue);
  }

  // ==================== String Analysis ====================

  /**
   * Get string length
   * Similar to PHP's strlen()
   * @param {string} str - String to measure
   * @returns {number}
   */
  static strlen(str) {
    return String(str).length;
  }

  /**
   * Find position of first occurrence of substring
   * Similar to PHP's strpos()
   * @param {string} haystack - String to search in
   * @param {string} needle - String to search for
   * @param {number} offset - Starting position (default: 0)
   * @returns {number|boolean} - Position or false if not found
   */
  static strpos(haystack, needle, offset = 0) {
    const pos = String(haystack).indexOf(needle, offset);
    return pos === -1 ? false : pos;
  }

  /**
   * Find position of last occurrence of substring
   * Similar to PHP's strrpos()
   * @param {string} haystack - String to search in
   * @param {string} needle - String to search for
   * @returns {number|boolean} - Position or false if not found
   */
  static strrpos(haystack, needle) {
    const pos = String(haystack).lastIndexOf(needle);
    return pos === -1 ? false : pos;
  }

  /**
   * Check if string contains substring
   * Similar to PHP's str_contains() (PHP 8+)
   * @param {string} haystack - String to search in
   * @param {string} needle - String to search for
   * @returns {boolean}
   */
  static strContains(haystack, needle) {
    return String(haystack).includes(needle);
  }

  /**
   * Check if string starts with substring
   * Similar to PHP's str_starts_with() (PHP 8+)
   * @param {string} haystack - String to check
   * @param {string} needle - Prefix to look for
   * @returns {boolean}
   */
  static startsWith(haystack, needle) {
    return String(haystack).startsWith(needle);
  }

  /**
   * Check if string ends with substring
   * Similar to PHP's str_ends_with() (PHP 8+)
   * @param {string} haystack - String to check
   * @param {string} needle - Suffix to look for
   * @returns {boolean}
   */
  static endsWith(haystack, needle) {
    return String(haystack).endsWith(needle);
  }

  // ==================== String Trimming ====================

  /**
   * Trim whitespace from both ends
   * Similar to PHP's trim()
   * @param {string} str - String to trim
   * @param {string} chars - Characters to trim (default: whitespace)
   * @returns {string}
   */
  static trim(str, chars = null) {
    str = String(str);
    if(chars === null) {
      return str.trim();
    }
    const pattern = new RegExp(`^[${this.escapeRegex(chars)}]+|[${this.escapeRegex(chars)}]+$`, 'g');
    return str.replace(pattern, '');
  }

  /**
   * Trim whitespace from left end
   * Similar to PHP's ltrim()
   * @param {string} str - String to trim
   * @param {string} chars - Characters to trim (default: whitespace)
   * @returns {string}
   */
  static ltrim(str, chars = null) {
    str = String(str);
    if(chars === null) {
      return str.trimStart();
    }
    const pattern = new RegExp(`^[${this.escapeRegex(chars)}]+`, 'g');
    return str.replace(pattern, '');
  }

  /**
   * Trim whitespace from right end
   * Similar to PHP's rtrim()
   * @param {string} str - String to trim
   * @param {string} chars - Characters to trim (default: whitespace)
   * @returns {string}
   */
  static rtrim(str, chars = null) {
    str = String(str);
    if(chars === null) {
      return str.trimEnd();
    }
    const pattern = new RegExp(`[${this.escapeRegex(chars)}]+$`, 'g');
    return str.replace(pattern, '');
  }

  // ==================== Substring Operations ====================

  /**
   * Return part of a string
   * Similar to PHP's substr()
   * @param {string} str - String to extract from
   * @param {number} start - Starting position
   * @param {number} length - Length to extract (optional)
   * @returns {string}
   */
  static substr(str, start, length = undefined) {
    str = String(str);
    if(length === undefined) {
      return str.slice(start);
    }
    if(length < 0) {
      return str.slice(start, length);
    }
    return str.slice(start, start + length);
  }

  /**
   * Count occurrences of substring
   * Similar to PHP's substr_count()
   * @param {string} haystack - String to search in
   * @param {string} needle - Substring to count
   * @returns {number}
   */
  static substrCount(haystack, needle) {
    if(!needle) return 0;
    return (String(haystack).match(new RegExp(this.escapeRegex(needle), 'g')) || []).length;
  }

  // ==================== Utility Methods ====================

  /**
   * Escape special regex characters
   * @param {string} str - String to escape
   * @returns {string}
   * @private
   */
  static escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Escape HTML special characters
   * Similar to PHP's htmlspecialchars()
   * @param {string} str - String to escape
   * @returns {string}
   */
  static htmlSpecialChars(str) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(str).replace(/[&<>"']/g, char => map[char]);
  }

  /**
   * Decode HTML entities
   * Similar to PHP's html_entity_decode()
   * @param {string} str - String to decode
   * @returns {string}
   */
  static htmlEntityDecode(str) {
    const map = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#039;': "'"
    };
    return String(str).replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, entity => map[entity]);
  }

  /**
   * Strip HTML and PHP tags
   * Similar to PHP's strip_tags()
   * @param {string} str - String to strip
   * @param {string} allowedTags - Tags to allow (e.g., '<p><a>')
   * @returns {string}
   */
  static stripTags(str, allowedTags = '') {
    str = String(str);

    // If no allowed tags, strip all
    if(!allowedTags) {
      return str.replace(/<\/?[^>]+(>|$)/g, '');
    }

    // Extract allowed tag names
    const allowed = allowedTags.match(/<\/?(\w+)/g)?.map(tag => tag.replace(/<\/?/, '')) || [];
    const pattern = new RegExp(`<(?!\\/?(${allowed.join('|')})[ >])[^>]*>`, 'gi');
    return str.replace(pattern, '');
  }

  /**
   * Truncate string to specified length
   * @param {string} str - String to truncate
   * @param {number} length - Maximum length
   * @param {string} suffix - Suffix to append (default: '...')
   * @returns {string}
   */
  static truncate(str, length, suffix = '...') {
    str = String(str);
    if(str.length <= length) return str;
    return str.slice(0, length - suffix.length) + suffix;
  }

  /**
   * Truncate string to word boundary
   * @param {string} str - String to truncate
   * @param {number} length - Maximum length
   * @param {string} suffix - Suffix to append (default: '...')
   * @returns {string}
   */
  static truncateWords(str, length, suffix = '...') {
    str = String(str);
    if(str.length <= length) return str;

    const truncated = str.slice(0, length - suffix.length);
    const lastSpace = truncated.lastIndexOf(' ');

    return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + suffix;
  }

  /**
   * Slugify string (make URL-friendly)
   * @param {string} str - String to slugify
   * @param {string} separator - Separator character (default: '-')
   * @returns {string}
   */
  static slugify(str, separator = '-') {
    return String(str)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, separator)
      .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
  }

  /**
   * Generate random string
   * @param {number} length - Length of random string
   * @param {string} chars - Character set to use
   * @returns {string}
   */
  static random(length = 16, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for(let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

}

module.exports = StringUtil;