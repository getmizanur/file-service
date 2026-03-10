const path = require('node:path');
// Dynamically resolve the project root
const projectRoot = path.resolve(__dirname, '../../..');
globalThis.applicationPath = (p) => {
  if (p === '/library/util/var-util') {
    // Mock VarUtil for isObject
    return path.join(projectRoot, 'library/util/var-util.js');
  }
  return path.join(projectRoot, p.replace(/^\//, ''));
};

// Mock VarUtil dependency
jest.mock('../../../library/util/var-util', () => ({
  isObject: (val) => val && typeof val === 'object' && !Array.isArray(val)
}));

let Element;
beforeAll(() => {
  const elementPath = globalThis.applicationPath('/library/form/element');
  Element = require(elementPath);
});

describe('Element', () => {
  let el;
  beforeEach(() => {
    el = new Element();
  });

  it('should set and get messages', () => {
    expect(el.getMessages()).toEqual([]);
    el.setMessages(['Error 1', 'Error 2']);
    expect(el.getMessages()).toEqual(['Error 1', 'Error 2']);
  });

  it('should overwrite messages on setMessages', () => {
    el.setMessages(['First']);
    expect(el.getMessages()).toEqual(['First']);
    el.setMessages(['Second', 'Third']);
    expect(el.getMessages()).toEqual(['Second', 'Third']);
  });

  it('should allow empty array for messages', () => {
    el.setMessages([]);
    expect(el.getMessages()).toEqual([]);
  });

  it('should coerce non-array to empty array for messages', () => {
    el.setMessages('not-an-array');
    expect(el.getMessages()).toEqual([]);
  });

  describe('label attributes', () => {
    it('should set and get a label attribute', () => {
      el.setLabelAttribute('class', 'bold');
      expect(el.getLabelAttribute('class')).toBe('bold');
    });

    it('should return default when label attribute is missing', () => {
      expect(el.getLabelAttribute('missing', 'fallback')).toBe('fallback');
    });

    it('should return null as default when label attribute is missing', () => {
      expect(el.getLabelAttribute('missing')).toBeNull();
    });

    it('should check label attribute existence', () => {
      el.setLabelAttribute('id', 'lbl');
      expect(el.hasLabelAttribute('id')).toBe(true);
      expect(el.hasLabelAttribute('nope')).toBe(false);
    });

    it('should set multiple label attributes from object', () => {
      el.setLabelAttributes({ class: 'bold', id: 'lbl' });
      expect(el.getLabelAttribute('class')).toBe('bold');
      expect(el.getLabelAttribute('id')).toBe('lbl');
    });

    it('should skip inherited properties in setLabelAttributes (line 69)', () => {
      const parent = { inherited: 'skip' };
      const attribs = Object.create(parent);
      attribs.own = 'keep';
      el.setLabelAttributes(attribs);
      expect(el.getLabelAttribute('own')).toBe('keep');
      expect(el.getLabelAttribute('inherited')).toBeNull();
    });

    it('should ignore non-object input in setLabelAttributes', () => {
      const result = el.setLabelAttributes('not-an-object');
      expect(result).toBe(el);
    });

    it('should ignore null input in setLabelAttributes', () => {
      const result = el.setLabelAttributes(null);
      expect(result).toBe(el);
    });

    it('should get all label attributes', () => {
      el.setLabelAttribute('a', 1);
      el.setLabelAttribute('b', 2);
      expect(el.getLabelAttributes()).toEqual({ a: 1, b: 2 });
    });

    it('should remove a label attribute', () => {
      el.setLabelAttribute('class', 'bold');
      el.removeLabelAttribute('class');
      expect(el.hasLabelAttribute('class')).toBe(false);
    });

    it('should clear all label attributes', () => {
      el.setLabelAttribute('a', 1);
      el.setLabelAttribute('b', 2);
      const result = el.clearLabelAttributes();
      expect(result).toBe(el);
      expect(el.getLabelAttributes()).toEqual({});
    });
  });

  describe('type', () => {
    it('should set and get type', () => {
      el.setType('text');
      expect(el.getType()).toBe('text');
    });

    it('should return default when type is not set', () => {
      expect(el.getType('fallback')).toBe('fallback');
    });

    it('should return null as default when type is not set', () => {
      expect(el.getType()).toBeNull();
    });
  });

  describe('attributes', () => {
    it('should remove an attribute', () => {
      el.setAttribute('class', 'big');
      const result = el.removeAttribute('class');
      expect(result).toBe(el);
      expect(el.hasAttribute('class')).toBe(false);
    });

    it('should get all attributes', () => {
      el.setAttribute('a', 1);
      el.setAttribute('b', 2);
      expect(el.getAttributes()).toEqual({ a: 1, b: 2 });
    });

    it('should clear all attributes', () => {
      el.setAttribute('a', 1);
      const result = el.clearAttributes();
      expect(result).toBe(el);
      expect(el.getAttributes()).toEqual({});
    });
  });

  describe('options', () => {
    it('should set and get a single option', () => {
      el.setOption('size', 'large');
      expect(el.getOption('size')).toBe('large');
    });

    it('should return default for missing option', () => {
      expect(el.getOption('missing', 'default')).toBe('default');
    });

    it('should return null as default for missing option', () => {
      expect(el.getOption('missing')).toBeNull();
    });

    it('should set multiple options from object', () => {
      el.setOptions({ a: 1, b: 2 });
      expect(el.getOption('a')).toBe(1);
      expect(el.getOption('b')).toBe(2);
    });

    it('should ignore non-object input in setOptions', () => {
      const result = el.setOptions('not-an-object');
      expect(result).toBe(el);
    });

    it('should get all options', () => {
      el.setOption('x', 10);
      el.setOption('y', 20);
      expect(el.getOptions()).toEqual({ x: 10, y: 20 });
    });

    it('should skip inherited properties in setOptions (line 155)', () => {
      const parent = { inherited: 'skip' };
      const opts = Object.create(parent);
      opts.own = 'keep';
      el.setOptions(opts);
      expect(el.getOption('own')).toBe('keep');
      expect(el.getOption('inherited')).toBeNull();
    });
  });

  describe('label', () => {
    it('should set and get label', () => {
      el.setLabel('Username');
      expect(el.getLabel()).toBe('Username');
    });

    it('should default label to null', () => {
      expect(el.getLabel()).toBeNull();
    });
  });

  describe('setAttributes with non-object (line 33)', () => {
    it('should return this when called with a string', () => {
      const result = el.setAttributes('not-an-object');
      expect(result).toBe(el);
    });

    it('should return this when called with null', () => {
      const result = el.setAttributes(null);
      expect(result).toBe(el);
    });

    it('should return this when called with an array', () => {
      const result = el.setAttributes([1, 2]);
      expect(result).toBe(el);
    });

    it('should set attributes from a valid object', () => {
      el.setAttributes({ id: 'myId', class: 'myClass' });
      expect(el.getAttribute('id')).toBe('myId');
      expect(el.getAttribute('class')).toBe('myClass');
    });

    it('should skip inherited properties', () => {
      const parent = { inherited: 'skip' };
      const attribs = Object.create(parent);
      attribs.own = 'keep';
      el.setAttributes(attribs);
      expect(el.getAttribute('own')).toBe('keep');
      expect(el.getAttribute('inherited')).toBeNull();
    });
  });
});
