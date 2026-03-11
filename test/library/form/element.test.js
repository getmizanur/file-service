const path = require('path');
const projectRoot = path.resolve(__dirname, '../../..');

// Set up global.applicationPath before requiring Element
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Element = require(path.join(projectRoot, 'library/form/element'));

describe('Element', () => {
  let el;

  beforeEach(() => {
    el = new Element();
  });

  // --- Label ---
  describe('label', () => {
    it('should default label to null', () => {
      expect(el.getLabel()).toBeNull();
    });

    it('should set and get label', () => {
      const ret = el.setLabel('Username');
      expect(ret).toBe(el); // chaining
      expect(el.getLabel()).toBe('Username');
    });
  });

  // --- Attributes ---
  describe('attributes', () => {
    it('should set and get a single attribute', () => {
      const ret = el.setAttribute('id', 'myInput');
      expect(ret).toBe(el);
      expect(el.getAttribute('id')).toBe('myInput');
    });

    it('should return default when attribute missing', () => {
      expect(el.getAttribute('missing')).toBeNull();
      expect(el.getAttribute('missing', 'fallback')).toBe('fallback');
    });

    it('should check hasAttribute', () => {
      expect(el.hasAttribute('id')).toBe(false);
      el.setAttribute('id', 'x');
      expect(el.hasAttribute('id')).toBe(true);
    });

    it('should set multiple attributes via setAttributes', () => {
      const ret = el.setAttributes({ id: 'a', class: 'b' });
      expect(ret).toBe(el);
      expect(el.getAttribute('id')).toBe('a');
      expect(el.getAttribute('class')).toBe('b');
    });

    it('should skip inherited properties in setAttributes (branch line 37)', () => {
      const parent = { inherited: 'skip' };
      const attribs = Object.create(parent);
      attribs.own = 'keep';
      el.setAttributes(attribs);
      expect(el.getAttribute('own')).toBe('keep');
      expect(el.getAttribute('inherited')).toBeNull();
    });

    it('should ignore non-object in setAttributes', () => {
      const ret = el.setAttributes('not-an-object');
      expect(ret).toBe(el);
      expect(el.getAttributes()).toEqual({});
    });

    it('should ignore array in setAttributes', () => {
      el.setAttributes([1, 2]);
      expect(el.getAttributes()).toEqual({});
    });

    it('should remove an attribute', () => {
      el.setAttribute('id', 'x');
      const ret = el.removeAttribute('id');
      expect(ret).toBe(el);
      expect(el.hasAttribute('id')).toBe(false);
    });

    it('should get all attributes', () => {
      el.setAttribute('a', '1');
      el.setAttribute('b', '2');
      expect(el.getAttributes()).toEqual({ a: '1', b: '2' });
    });

    it('should clear all attributes', () => {
      el.setAttribute('a', '1');
      const ret = el.clearAttributes();
      expect(ret).toBe(el);
      expect(el.getAttributes()).toEqual({});
    });
  });

  // --- Label attributes (lines 58-84, 110-131) ---
  describe('labelAttributes', () => {
    it('should set and get a label attribute', () => {
      const ret = el.setLabelAttribute('class', 'label-class');
      expect(ret).toBe(el);
      expect(el.getLabelAttribute('class')).toBe('label-class');
    });

    it('should return default when label attribute missing', () => {
      expect(el.getLabelAttribute('missing')).toBeNull();
      expect(el.getLabelAttribute('missing', 'def')).toBe('def');
    });

    it('should check hasLabelAttribute', () => {
      expect(el.hasLabelAttribute('class')).toBe(false);
      el.setLabelAttribute('class', 'x');
      expect(el.hasLabelAttribute('class')).toBe(true);
    });

    it('should set multiple label attributes', () => {
      const ret = el.setLabelAttributes({ for: 'input1', class: 'lbl' });
      expect(ret).toBe(el);
      expect(el.getLabelAttribute('for')).toBe('input1');
    });

    it('should skip inherited properties in setLabelAttributes (branch line 69)', () => {
      const parent = { inherited: 'skip' };
      const attribs = Object.create(parent);
      attribs.own = 'keep';
      el.setLabelAttributes(attribs);
      expect(el.getLabelAttribute('own')).toBe('keep');
      expect(el.getLabelAttribute('inherited')).toBeNull();
    });

    it('should ignore non-object in setLabelAttributes', () => {
      const ret = el.setLabelAttributes(null);
      expect(ret).toBe(el);
    });

    it('should ignore array in setLabelAttributes', () => {
      el.setLabelAttributes([1, 2]);
      expect(el.getLabelAttributes()).toEqual({});
    });

    it('should remove a label attribute', () => {
      el.setLabelAttribute('class', 'x');
      const ret = el.removeLabelAttribute('class');
      expect(ret).toBe(el);
      expect(el.hasLabelAttribute('class')).toBe(false);
    });

    it('should get all label attributes', () => {
      el.setLabelAttribute('a', '1');
      expect(el.getLabelAttributes()).toEqual({ a: '1' });
    });

    it('should clear all label attributes', () => {
      el.setLabelAttribute('a', '1');
      const ret = el.clearLabelAttributes();
      expect(ret).toBe(el);
      expect(el.getLabelAttributes()).toEqual({});
    });
  });

  // --- Name / Type convenience (lines 87-103) ---
  describe('name and type', () => {
    it('should set and get name', () => {
      const ret = el.setName('email');
      expect(ret).toBe(el);
      expect(el.getName()).toBe('email');
    });

    it('should set and get type', () => {
      const ret = el.setType('text');
      expect(ret).toBe(el);
      expect(el.getType()).toBe('text');
    });

    it('should return default for getType when not set', () => {
      expect(el.getType()).toBeNull();
      expect(el.getType('fallback')).toBe('fallback');
    });
  });

  // --- Value (lines 133-140) ---
  describe('value', () => {
    it('should set and get value', () => {
      const ret = el.setValue('hello');
      expect(ret).toBe(el);
      expect(el.getValue()).toBe('hello');
    });

    it('should return default for getValue when not set', () => {
      expect(el.getValue()).toBeNull();
      expect(el.getValue('def')).toBe('def');
    });
  });

  // --- Options (lines 145-170) ---
  describe('options', () => {
    it('should set and get a single option', () => {
      const ret = el.setOption('key', 'val');
      expect(ret).toBe(el);
      expect(el.getOption('key')).toBe('val');
    });

    it('should return default when option missing', () => {
      expect(el.getOption('nope')).toBeNull();
      expect(el.getOption('nope', 'def')).toBe('def');
    });

    it('should set multiple options', () => {
      const ret = el.setOptions({ a: 1, b: 2 });
      expect(ret).toBe(el);
      expect(el.getOption('a')).toBe(1);
      expect(el.getOption('b')).toBe(2);
    });

    it('should skip inherited properties in setOptions (branch line 155)', () => {
      const parent = { inherited: 'skip' };
      const opts = Object.create(parent);
      opts.own = 'keep';
      el.setOptions(opts);
      expect(el.getOption('own')).toBe('keep');
      expect(el.getOption('inherited')).toBeNull();
    });

    it('should ignore non-object in setOptions', () => {
      const ret = el.setOptions('string');
      expect(ret).toBe(el);
    });

    it('should get all options', () => {
      el.setOption('x', 1);
      expect(el.getOptions()).toEqual({ x: 1 });
    });
  });

  // --- Messages (lines 172-179) ---
  describe('messages', () => {
    it('should default to empty array', () => {
      expect(el.getMessages()).toEqual([]);
    });

    it('should set and get messages', () => {
      el.setMessages(['Error 1', 'Error 2']);
      expect(el.getMessages()).toEqual(['Error 1', 'Error 2']);
    });

    it('should overwrite messages', () => {
      el.setMessages(['First']);
      el.setMessages(['Second', 'Third']);
      expect(el.getMessages()).toEqual(['Second', 'Third']);
    });

    it('should coerce non-array to empty array', () => {
      el.setMessages('not-array');
      expect(el.getMessages()).toEqual([]);
    });

    it('should accept empty array', () => {
      el.setMessages([]);
      expect(el.getMessages()).toEqual([]);
    });
  });
});
