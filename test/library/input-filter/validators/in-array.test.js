const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../');
const InArray = require(path.join(projectRoot, 'library/input-filter/validators/in-array'));

describe('InArray', () => {

  describe('constructor', () => {
    it('should use defaults when called without arguments (branch line 6)', () => {
      const v = new InArray();
      expect(v.name).toBe('input');
      expect(v.haystack).toBeUndefined();
    });

    it('should use default name when not provided', () => {
      const v = new InArray({ haystack: ['a', 'b'] });
      expect(v.name).toBe('input');
    });

    it('should store haystack from options', () => {
      const haystack = ['apple', 'banana'];
      const v = new InArray({ haystack });
      expect(v.getHaystack()).toBe(haystack);
    });
  });

  describe('isValid', () => {
    it('should return false for non-string values', () => {
      const v = new InArray({ name: 'fruit', haystack: ['apple'] });
      expect(v.isValid(123)).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID);
    });

    it('should return false for null', () => {
      const v = new InArray({ name: 'fruit', haystack: ['apple'] });
      expect(v.isValid(null)).toBe(false);
      expect(v.message).toBe(v.messageTemplate.INVALID);
    });

    it('should return true when value is in the haystack', () => {
      const v = new InArray({ name: 'fruit', haystack: ['apple', 'banana'] });
      expect(v.isValid('apple')).toBe(true);
    });

    it('should return false when value is not in the haystack', () => {
      const v = new InArray({ name: 'fruit', haystack: ['apple', 'banana'] });
      expect(v.isValid('cherry')).toBe(false);
      expect(v.message).toBe(v.messageTemplate.NOT_IN_ARRAY);
    });

    it('should use custom message when set via setMessage', () => {
      const v = new InArray({ name: 'fruit', haystack: ['apple'] });
      v.setMessage('Not a valid fruit');
      expect(v.isValid('cherry')).toBe(false);
      expect(v.message).toBe('Not a valid fruit');
    });
  });

  describe('setMessage', () => {
    it('should set custom message for default key NOT_IN_ARRAY', () => {
      const v = new InArray({ haystack: [] });
      const result = v.setMessage('Custom not found');
      expect(v.customMessages.NOT_IN_ARRAY).toBe('Custom not found');
      expect(result).toBe(v);
    });

    it('should set custom message for a specific key', () => {
      const v = new InArray({ haystack: [] });
      v.setMessage('Custom invalid', 'INVALID');
      expect(v.customMessages.INVALID).toBe('Custom invalid');
    });
  });

  describe('getHaystack', () => {
    it('should return the haystack array', () => {
      const haystack = ['x', 'y', 'z'];
      const v = new InArray({ haystack });
      expect(v.getHaystack()).toEqual(['x', 'y', 'z']);
    });
  });

});
