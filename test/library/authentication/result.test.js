const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const Result = require(path.join(projectRoot, 'library/authentication/result'));

describe('Result', () => {

  describe('static constants', () => {
    it('should define FAILURE as 0', () => {
      expect(Result.FAILURE).toBe(0);
    });

    it('should define FAILURE_IDENTITY_NOT_FOUND as -1', () => {
      expect(Result.FAILURE_IDENTITY_NOT_FOUND).toBe(-1);
    });

    it('should define FAILURE_IDENTITY_AMBIGUOUS as -2', () => {
      expect(Result.FAILURE_IDENTITY_AMBIGUOUS).toBe(-2);
    });

    it('should define FAILURE_CREDENTIAL_INVALID as -3', () => {
      expect(Result.FAILURE_CREDENTIAL_INVALID).toBe(-3);
    });

    it('should define FAILURE_UNCATEGORIZED as -4', () => {
      expect(Result.FAILURE_UNCATEGORIZED).toBe(-4);
    });

    it('should define SUCCESS as 1', () => {
      expect(Result.SUCCESS).toBe(1);
    });
  });

  describe('constructor', () => {
    it('should set code and identity', () => {
      const result = new Result(Result.SUCCESS, 'user1');
      expect(result.getCode()).toBe(1);
      expect(result.getIdentity()).toBe('user1');
    });

    it('should default messages to empty array', () => {
      const result = new Result(Result.SUCCESS, 'user1');
      expect(result.getMessages()).toEqual([]);
    });

    it('should normalize a string message to an array', () => {
      const result = new Result(Result.FAILURE, null, 'error occurred');
      expect(result.getMessages()).toEqual(['error occurred']);
    });

    it('should accept an array of messages and filter non-strings', () => {
      const result = new Result(Result.FAILURE, null, ['msg1', 42, 'msg2', null]);
      expect(result.getMessages()).toEqual(['msg1', 'msg2']);
    });

    it('should set messages to empty array when messages is not string or array', () => {
      const result = new Result(Result.FAILURE, null, 123);
      expect(result.getMessages()).toEqual([]);
    });

    it('should fallback to FAILURE_UNCATEGORIZED when code is not finite', () => {
      const result = new Result(undefined, null);
      expect(result.getCode()).toBe(Result.FAILURE_UNCATEGORIZED);
    });

    it('should fallback to FAILURE_UNCATEGORIZED when code is NaN', () => {
      const result = new Result(NaN, null);
      expect(result.getCode()).toBe(Result.FAILURE_UNCATEGORIZED);
    });
  });

  describe('isValid', () => {
    it('should return true for SUCCESS', () => {
      const result = new Result(Result.SUCCESS, 'user1');
      expect(result.isValid()).toBe(true);
    });

    it('should return false for FAILURE (0)', () => {
      const result = new Result(Result.FAILURE, null);
      expect(result.isValid()).toBe(false);
    });

    it('should return false for negative codes', () => {
      const result = new Result(Result.FAILURE_IDENTITY_NOT_FOUND, null);
      expect(result.isValid()).toBe(false);
    });
  });

  describe('addMessage', () => {
    it('should add a valid string message', () => {
      const result = new Result(Result.FAILURE, null);
      result.addMessage('new error');
      expect(result.getMessages()).toEqual(['new error']);
    });

    it('should ignore non-string values', () => {
      const result = new Result(Result.FAILURE, null);
      result.addMessage(123);
      result.addMessage(null);
      result.addMessage(undefined);
      expect(result.getMessages()).toEqual([]);
    });

    it('should ignore empty strings', () => {
      const result = new Result(Result.FAILURE, null);
      result.addMessage('');
      expect(result.getMessages()).toEqual([]);
    });

    it('should return this for chaining', () => {
      const result = new Result(Result.FAILURE, null);
      const returned = result.addMessage('msg');
      expect(returned).toBe(result);
    });
  });

  describe('addMessages', () => {
    it('should add multiple messages', () => {
      const result = new Result(Result.FAILURE, null);
      result.addMessages(['msg1', 'msg2']);
      expect(result.getMessages()).toEqual(['msg1', 'msg2']);
    });

    it('should filter non-string and empty entries via addMessage', () => {
      const result = new Result(Result.FAILURE, null);
      result.addMessages(['valid', '', 42, 'also valid']);
      expect(result.getMessages()).toEqual(['valid', 'also valid']);
    });

    it('should handle non-array argument gracefully', () => {
      const result = new Result(Result.FAILURE, null);
      result.addMessages('not an array');
      expect(result.getMessages()).toEqual([]);
    });

    it('should return this for chaining', () => {
      const result = new Result(Result.FAILURE, null);
      const returned = result.addMessages(['msg']);
      expect(returned).toBe(result);
    });
  });

  describe('toJSON', () => {
    it('should return correct shape for a success result', () => {
      const result = new Result(Result.SUCCESS, 'admin', ['welcome']);
      const json = result.toJSON();
      expect(json).toEqual({
        code: 1,
        valid: true,
        identity: 'admin',
        messages: ['welcome']
      });
    });

    it('should return correct shape for a failure result', () => {
      const result = new Result(Result.FAILURE, null, ['bad credentials']);
      const json = result.toJSON();
      expect(json).toEqual({
        code: 0,
        valid: false,
        identity: null,
        messages: ['bad credentials']
      });
    });

    it('should return a copy of messages, not the same reference', () => {
      const result = new Result(Result.SUCCESS, 'user1', ['msg']);
      const json = result.toJSON();
      json.messages.push('extra');
      expect(result.getMessages()).toEqual(['msg']);
    });
  });
});
