const path = require('path');
const projectRoot = path.resolve(__dirname, '../../..');

// Set up global.applicationPath before requiring anything
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const Form = require(path.join(projectRoot, 'library/form/form'));
const Element = require(path.join(projectRoot, 'library/form/element'));

// Helper to create a simple element with a name
function makeElement(name, type) {
  const el = new Element();
  el.setName(name);
  if (type) el.setType(type);
  return el;
}

describe('Form', () => {
  let form;

  beforeEach(() => {
    form = new Form();
  });

  // --- Constructor ---
  describe('constructor', () => {
    it('should initialise with defaults', () => {
      expect(form.getElements()).toEqual({});
      expect(form.getAttribs()).toEqual({});
      expect(form.getData()).toBeNull();
      expect(form.getInputFilter()).toBeNull();
    });

    it('should accept options with debug flag', () => {
      const f = new Form({ debug: true });
      expect(f.debug).toBe(true);
    });

    it('should default debug to false', () => {
      expect(form.debug).toBe(false);
    });
  });

  // --- add / get / has / remove ---
  describe('elements', () => {
    it('should add and get an element', () => {
      const el = makeElement('username');
      const ret = form.add(el);
      expect(ret).toBe(form);
      expect(form.get('username')).toBe(el);
    });

    it('should throw when adding invalid element', () => {
      expect(() => form.add(null)).toThrow(TypeError);
      expect(() => form.add({})).toThrow(TypeError);
    });

    it('should check has', () => {
      expect(form.has('x')).toBe(false);
      form.add(makeElement('x'));
      expect(form.has('x')).toBe(true);
    });

    it('should remove element', () => {
      form.add(makeElement('x'));
      const ret = form.remove('x');
      expect(ret).toBe(form);
      expect(form.has('x')).toBe(false);
    });

    it('should no-op remove for missing element', () => {
      const ret = form.remove('missing');
      expect(ret).toBe(form);
    });

    it('should get all elements', () => {
      form.add(makeElement('a'));
      form.add(makeElement('b'));
      const els = form.getElements();
      expect(Object.keys(els)).toEqual(['a', 'b']);
    });
  });

  // --- Attribs (lines 89-119) ---
  describe('attribs', () => {
    it('should set and get action', () => {
      const ret = form.setAction('/login');
      expect(ret).toBe(form);
      expect(form.getAction()).toBe('/login');
    });

    it('should set and get method', () => {
      form.setMethod('POST');
      expect(form.getMethod()).toBe('POST');
    });

    it('should set and get a single attrib', () => {
      form.setAttrib('enctype', 'multipart/form-data');
      expect(form.getAttrib('enctype')).toBe('multipart/form-data');
    });

    it('should return null for missing attrib', () => {
      expect(form.getAttrib('nope')).toBeNull();
    });

    it('should setAttribs (clears first)', () => {
      form.setAttrib('old', 'val');
      form.setAttribs({ new: 'val2' });
      expect(form.getAttrib('old')).toBeNull();
      expect(form.getAttrib('new')).toBe('val2');
    });

    it('should addAttribs (merges)', () => {
      form.setAttrib('existing', '1');
      form.addAttribs({ added: '2' });
      expect(form.getAttrib('existing')).toBe('1');
      expect(form.getAttrib('added')).toBe('2');
    });

    it('should ignore non-object in addAttribs', () => {
      const ret = form.addAttribs(null);
      expect(ret).toBe(form);
    });

    it('should removeAttrib', () => {
      form.setAttrib('x', '1');
      form.removeAttrib('x');
      expect(form.getAttrib('x')).toBeNull();
    });

    it('should clearAttribs', () => {
      form.setAttrib('a', '1');
      form.clearAttribs();
      expect(form.getAttribs()).toEqual({});
    });

    it('should return attribs via getAttributes alias', () => {
      form.setAttrib('k', 'v');
      expect(form.getAttributes()).toEqual({ k: 'v' });
    });
  });

  // --- setData / getData / populateValues (lines 133-206) ---
  describe('setData / populateValues', () => {
    it('should set data and populate element values', () => {
      const el = makeElement('email', 'text');
      form.add(el);
      form.setData({ email: 'a@b.com' });
      expect(form.getData()).toEqual({ email: 'a@b.com' });
      expect(el.getValue()).toBe('a@b.com');
    });

    it('should handle null data', () => {
      form.setData(null);
      expect(form.getData()).toEqual({});
    });

    it('should not crash with non-object data in populateValues', () => {
      const ret = form.populateValues(null);
      expect(ret).toBe(form);
    });

    it('should skip undefined values in _populateElementValue', () => {
      const el = makeElement('field', 'text');
      form.add(el);
      form.setData({ field: undefined });
      expect(el.getValue()).toBeNull();
    });

    it('should convert null value to empty string', () => {
      const el = makeElement('field', 'text');
      form.add(el);
      form.setData({ field: null });
      expect(el.getValue()).toBe('');
    });

    it('should populate checkbox element', () => {
      const el = makeElement('agree', 'checkbox');
      el.setAttribute('value', 'on');
      form.add(el);
      form.setData({ agree: 'on' });
      expect(el.getAttribute('checked')).toBe('checked');
    });

    it('should populate checkbox with truthy values', () => {
      const el = makeElement('agree', 'checkbox');
      el.setAttribute('value', 'on');
      form.add(el);

      form.setData({ agree: true });
      expect(el.getAttribute('checked')).toBe('checked');

      form.setData({ agree: 1 });
      expect(el.getAttribute('checked')).toBe('checked');

      form.setData({ agree: '1' });
      expect(el.getAttribute('checked')).toBe('checked');
    });

    it('should uncheck checkbox for non-matching value', () => {
      const el = makeElement('agree', 'checkbox');
      el.setAttribute('value', 'on');
      form.add(el);
      form.setData({ agree: 'off' });
      expect(el.getAttribute('checked')).toBeNull();
    });

    it('should populate checkbox with array value', () => {
      const el = makeElement('colors', 'checkbox');
      el.setAttribute('value', 'red');
      form.add(el);
      form.setData({ colors: ['red', 'blue'] });
      expect(el.getAttribute('checked')).toBe('checked');
    });

    it('should not check checkbox when array does not include value', () => {
      const el = makeElement('colors', 'checkbox');
      el.setAttribute('value', 'green');
      form.add(el);
      form.setData({ colors: ['red', 'blue'] });
      expect(el.getAttribute('checked')).toBeNull();
    });

    it('should populate radio element with valueOptions', () => {
      const el = makeElement('gender', 'radio');
      el.getValueOptions = () => ({ m: 'Male', f: 'Female' });
      form.add(el);
      form.setData({ gender: 'm' });
      expect(el.getValue()).toBe('m');
    });

    it('should populate single radio input', () => {
      const el = makeElement('color', 'radio');
      el.setAttribute('value', 'red');
      form.add(el);
      form.setData({ color: 'red' });
      expect(el.getAttribute('checked')).toBe('checked');
    });

    it('should not check single radio when value differs', () => {
      const el = makeElement('color', 'radio');
      el.setAttribute('value', 'red');
      form.add(el);
      form.setData({ color: 'blue' });
      expect(el.getAttribute('checked')).toBeNull();
    });

    it('should populate select element', () => {
      const el = makeElement('country', 'select');
      form.add(el);
      form.setData({ country: 'US' });
      expect(el.getValue()).toBe('US');
    });

    it('should populate select-one element', () => {
      const el = makeElement('country', 'select-one');
      form.add(el);
      form.setData({ country: 'UK' });
      expect(el.getValue()).toBe('UK');
    });

    it('should populate select-multiple element', () => {
      const el = makeElement('tags', 'select-multiple');
      form.add(el);
      form.setData({ tags: ['a', 'b'] });
      expect(el.getValue()).toEqual(['a', 'b']);
    });

    it('should handle error in _populateElementValue gracefully', () => {
      const el = makeElement('broken', 'text');
      // Make getAttribute throw to trigger catch
      const originalGetAttribute = el.getAttribute.bind(el);
      let firstCall = true;
      el.getAttribute = (key, def) => {
        if (key === 'type' && firstCall) {
          firstCall = false;
          throw new Error('test error');
        }
        return originalGetAttribute(key, def);
      };
      form.add(el);
      // Should not throw - fallback sets value
      form.setData({ broken: 'fallback-val' });
    });
  });

  // --- bind ---
  describe('bind', () => {
    it('should alias setData', () => {
      const el = makeElement('x', 'text');
      form.add(el);
      form.bind({ x: 'hello' });
      expect(el.getValue()).toBe('hello');
    });
  });

  // --- getValues (lines 257-276) ---
  describe('getValues', () => {
    it('should extract default values', () => {
      const el = makeElement('name', 'text');
      el.setValue('John');
      form.add(el);
      expect(form.getValues()).toEqual({ name: 'John' });
    });

    it('should skip empty default values', () => {
      const el = makeElement('name', 'text');
      form.add(el);
      expect(form.getValues()).toEqual({});
    });

    it('should extract checkbox value when checked', () => {
      const el = makeElement('agree', 'checkbox');
      el.setAttribute('value', 'yes');
      el.setAttribute('checked', 'checked');
      form.add(el);
      expect(form.getValues()).toEqual({ agree: 'yes' });
    });

    it('should consolidate multiple checkbox values into array (lines 284-288)', () => {
      const el1 = makeElement('colors', 'checkbox');
      el1.setAttribute('value', 'red');
      el1.setAttribute('checked', 'checked');

      const el2 = makeElement('colors', 'checkbox');
      el2.setAttribute('value', 'blue');
      el2.setAttribute('checked', 'checked');

      const values = {};
      form._extractCheckboxValue(el1, 'colors', values);
      form._extractCheckboxValue(el2, 'colors', values);
      expect(values.colors).toEqual(['red', 'blue']);
    });

    it('should use "on" as default checkbox value when no value attribute', () => {
      const values = {};
      const el = makeElement('agree', 'checkbox');
      el.setAttribute('checked', 'checked');
      form._extractCheckboxValue(el, 'agree', values);
      expect(values.agree).toBe('on');
    });

    it('should not extract checkbox value when unchecked', () => {
      const el = makeElement('agree', 'checkbox');
      el.setAttribute('value', 'yes');
      form.add(el);
      expect(form.getValues()).toEqual({});
    });

    it('should extract radio value with valueOptions', () => {
      const el = makeElement('gender', 'radio');
      el.getValueOptions = () => ({ m: 'Male' });
      el.setValue('m');
      form.add(el);
      expect(form.getValues()).toEqual({ gender: 'm' });
    });

    it('should skip radio with valueOptions when no selection', () => {
      const el = makeElement('gender', 'radio');
      el.getValueOptions = () => ({ m: 'Male' });
      form.add(el);
      expect(form.getValues()).toEqual({});
    });

    it('should extract single radio value when checked', () => {
      const el = makeElement('color', 'radio');
      el.setAttribute('value', 'red');
      el.setAttribute('checked', 'checked');
      form.add(el);
      expect(form.getValues()).toEqual({ color: 'red' });
    });

    it('should not extract single radio when unchecked', () => {
      const el = makeElement('color', 'radio');
      el.setAttribute('value', 'red');
      form.add(el);
      expect(form.getValues()).toEqual({});
    });

    it('should handle element without getAttribute', () => {
      const el = { getName: () => 'x', getValue: () => 'val' };
      form.add(el);
      expect(form.getValues()).toEqual({ x: 'val' });
    });

    it('should extract single radio checked value via _extractRadioValue (lines 303-306)', () => {
      const values = {};
      const el = makeElement('color', 'radio');
      el.setAttribute('value', 'red');
      el.setAttribute('checked', 'checked');
      form._extractRadioValue(el, 'color', values);
      expect(values.color).toBe('red');
    });

    it('should not extract single radio unchecked via _extractRadioValue', () => {
      const values = {};
      const el = makeElement('color', 'radio');
      el.setAttribute('value', 'red');
      form._extractRadioValue(el, 'color', values);
      expect(values.color).toBeUndefined();
    });

    it('should extract default value via _extractDefaultValue (lines 309-313)', () => {
      const values = {};
      const el = makeElement('name', 'text');
      el.setValue('John');
      form._extractDefaultValue(el, 'name', values);
      expect(values.name).toBe('John');
    });

    it('should not extract default value when empty via _extractDefaultValue', () => {
      const values = {};
      const el = makeElement('name', 'text');
      form._extractDefaultValue(el, 'name', values);
      expect(values.name).toBeUndefined();
    });
  });

  // --- isValid / inputFilter (lines 321-341) ---
  describe('isValid', () => {
    it('should return true when no inputFilter', () => {
      expect(form.isValid()).toBe(true);
    });

    it('should delegate to inputFilter', () => {
      const mockFilter = {
        setData: jest.fn(),
        isValid: jest.fn().mockReturnValue(false),
      };
      form.setInputFilter(mockFilter);
      expect(form.getInputFilter()).toBe(mockFilter);

      form.setData({ email: 'x' });
      expect(form.isValid()).toBe(false);
      expect(mockFilter.setData).toHaveBeenCalledWith({ email: 'x' });
    });

    it('should accept explicit data param', () => {
      const mockFilter = {
        setData: jest.fn(),
        isValid: jest.fn().mockReturnValue(true),
      };
      form.setInputFilter(mockFilter);
      form.isValid({ custom: 'data' });
      expect(mockFilter.setData).toHaveBeenCalledWith({ custom: 'data' });
    });

    it('should use empty object when no data anywhere', () => {
      const mockFilter = {
        setData: jest.fn(),
        isValid: jest.fn().mockReturnValue(true),
      };
      form.setInputFilter(mockFilter);
      form.isValid();
      expect(mockFilter.setData).toHaveBeenCalledWith({});
    });
  });

  // --- getMessages / hasErrors (lines 343-361) ---
  describe('getMessages / hasErrors', () => {
    it('should return empty when no inputFilter', () => {
      expect(form.getMessages()).toEqual({});
      expect(form.hasErrors()).toBe(false);
    });

    it('should return messages from invalidInputs', () => {
      const mockFilter = {
        getInvalidInputs: () => ({
          email: { getMessages: () => ['Required'] },
        }),
      };
      form.setInputFilter(mockFilter);
      expect(form.getMessages()).toEqual({ email: ['Required'] });
      expect(form.hasErrors()).toBe(true);
    });

    it('should report no errors when invalidInputs empty', () => {
      const mockFilter = { getInvalidInputs: () => ({}) };
      form.setInputFilter(mockFilter);
      expect(form.hasErrors()).toBe(false);
    });
  });

  // --- reset (lines 367-385) ---
  describe('reset', () => {
    it('should reset text element values', () => {
      const el = makeElement('name', 'text');
      el.setValue('John');
      form.add(el);
      form.setData({ name: 'John' });

      const ret = form.reset();
      expect(ret).toBe(form);
      expect(el.getValue()).toBe('');
      expect(form.getData()).toEqual({});
    });

    it('should handle element without getAttribute in reset (lines 370, 375-378)', () => {
      const el = { getName: () => 'custom', setValue: jest.fn() };
      form.add(el);
      form.reset();
      expect(el.setValue).toHaveBeenCalledWith('');
    });

    it('should handle checkbox element without setAttribute in reset', () => {
      const el = {
        getName: () => 'cb',
        getAttribute: (k) => k === 'type' ? 'checkbox' : null
      };
      form.add(el);
      form.reset();
    });

    it('should reset checkbox and radio to unchecked', () => {
      const cb = makeElement('agree', 'checkbox');
      cb.setAttribute('checked', 'checked');
      form.add(cb);

      const radio = makeElement('color', 'radio');
      radio.setAttribute('checked', 'checked');
      form.add(radio);

      form.reset();
      expect(cb.getAttribute('checked')).toBeNull();
      expect(radio.getAttribute('checked')).toBeNull();
    });
  });

  // --- _log ---
  describe('_log', () => {
    it('should log when debug is true', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation();
      const f = new Form({ debug: true });
      f._log('test message');
      expect(spy).toHaveBeenCalledWith('[Form]', 'test message');
      spy.mockRestore();
    });

    it('should not log when debug is false', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation();
      form._log('test');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // --- Branch coverage for inherited properties in addAttribs (line 82) ---
  describe('addAttribs inherited property branch', () => {
    it('should skip inherited properties in addAttribs (line 82)', () => {
      const parent = { inherited: 'skip' };
      const attribs = Object.create(parent);
      attribs.action = '/submit';
      form.addAttribs(attribs);
      expect(form.getAttrib('action')).toBe('/submit');
      expect(form.getAttrib('inherited')).toBeNull();
    });
  });

  // --- populateValues / _populateElementValue branches ---
  describe('populateValues branches', () => {
    it('should populate text element via populateValues (line 160)', () => {
      const Text = require(path.join(projectRoot, 'library/form/element/text'));
      const el = new Text();
      el.setName('username');
      form.add(el);
      form.populateValues({ username: 'john' });
      expect(el.getValue()).toBe('john');
    });

    it('should handle element without getAttribute (line 174)', () => {
      const el = { getName: () => 'custom', setValue: jest.fn() };
      form.add(el);
      form.populateValues({ custom: 'val' });
      expect(el.setValue).toHaveBeenCalledWith('val');
    });

    it('should populate checkbox element via populateValues (line 224)', () => {
      const Checkbox = require(path.join(projectRoot, 'library/form/element/checkbox'));
      const cb = new Checkbox();
      cb.setName('agree');
      cb.setAttribute('type', 'checkbox');
      cb.setAttribute('value', 'yes');
      form.add(cb);
      form.populateValues({ agree: 'yes' });
      expect(cb.getAttribute('checked')).toBe('checked');
    });

    it('should populate radio element with getValueOptions (lines 233-236)', () => {
      const el = {
        getName: () => 'color',
        getAttribute: (a) => a === 'type' ? 'radio' : null,
        getValueOptions: () => ['red', 'blue'],
        setValue: jest.fn()
      };
      form.add(el);
      form.populateValues({ color: 'blue' });
      expect(el.setValue).toHaveBeenCalledWith('blue');
    });

    it('should populate single radio element via setAttribute (line 248)', () => {
      const el = {
        getName: () => 'size',
        getAttribute: jest.fn((a) => {
          if (a === 'type') return 'radio';
          if (a === 'value') return 'large';
          return null;
        }),
        setAttribute: jest.fn()
      };
      form.add(el);
      form.populateValues({ size: 'large' });
      expect(el.setAttribute).toHaveBeenCalledWith('checked', 'checked');
    });

    it('should handle error in _populateElementValue with fallback (line 213)', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation();
      const f = new Form({ debug: true });
      const el = {
        getName: () => 'broken',
        getAttribute: () => { throw new Error('boom'); },
        setValue: jest.fn()
      };
      f.add(el);
      f.populateValues({ broken: 'val' });
      expect(el.setValue).toHaveBeenCalledWith('val');
      spy.mockRestore();
    });
  });

  // --- _extractCheckboxValue consolidation (line 285) ---
  describe('_extractCheckboxValue consolidation', () => {
    it('should consolidate multiple checked checkboxes into array (line 285)', () => {
      const el1 = {
        getName: () => 'tags',
        getAttribute: (a) => {
          if (a === 'type') return 'checkbox';
          if (a === 'checked') return 'checked';
          if (a === 'value') return 'js';
          return null;
        }
      };
      const el2 = {
        getName: () => 'tags',
        getAttribute: (a) => {
          if (a === 'type') return 'checkbox';
          if (a === 'checked') return 'checked';
          if (a === 'value') return 'ts';
          return null;
        }
      };
      const values = {};
      form._extractCheckboxValue(el1, 'tags', values);
      form._extractCheckboxValue(el2, 'tags', values);
      expect(values.tags).toEqual(['js', 'ts']);
    });
  });

  // --- _extractRadioValue with getValueOptions (line 296) ---
  describe('_extractRadioValue with getValueOptions', () => {
    it('should extract value from radio group element (line 296)', () => {
      const el = {
        getValueOptions: () => ['a', 'b'],
        getValue: () => 'b'
      };
      const values = {};
      form._extractRadioValue(el, 'choice', values);
      expect(values.choice).toBe('b');
    });
  });

  // --- _extractDefaultValue (line 310) ---
  describe('_extractDefaultValue', () => {
    it('should extract value from element with getValue (line 310)', () => {
      const el = { getValue: () => 'hello' };
      const values = {};
      form._extractDefaultValue(el, 'field', values);
      expect(values.field).toBe('hello');
    });
  });

  // --- reset with text element (line 378) ---
  describe('reset text element', () => {
    it('should reset text element value to empty string (line 378)', () => {
      const Text = require(path.join(projectRoot, 'library/form/element/text'));
      const el = new Text();
      el.setName('username');
      el.setValue('john');
      form.add(el);
      form.reset();
      expect(el.getValue()).toBe('');
    });
  });

  // --- Extra branch coverage ---

  // Line 160 FALSE branch: element in form but not in data
  describe('populateValues line 160 false branch', () => {
    it('should skip element when its name is not in data (line 160 false branch)', () => {
      const el = makeElement('notInData', 'text');
      el.setValue('original');
      form.add(el);
      form.populateValues({ someOtherField: 'value' });
      // el should not be changed
      expect(el.getValue()).toBe('original');
    });
  });

  // Line 194 FALSE branch: default case element without setValue
  describe('_populateElementValue line 194 false branch', () => {
    it('should not throw when element has no setValue in default case (line 194 false branch)', () => {
      const el = {
        getName: () => 'noSetter',
        getAttribute: (k) => k === 'type' ? 'text' : null
        // no setValue
      };
      form.add(el);
      expect(() => form.populateValues({ noSetter: 'val' })).not.toThrow();
    });
  });

  // Line 213 FALSE branch: catch block with element having no setValue
  describe('_populateElementValue line 213 false branch', () => {
    it('should not throw when element in catch has no setValue (line 213 false branch)', () => {
      const el = {
        getName: () => 'broken2',
        getAttribute: () => { throw new Error('boom'); }
        // no setValue
      };
      form.add(el);
      expect(() => form.populateValues({ broken2: 'val' })).not.toThrow();
    });
  });

  // Line 209 FALSE branch: _populateCheckbox || 'on' fallback when getAttribute('value') is null
  describe('_populateCheckbox line 209 || fallback', () => {
    it('should use "on" as elementValue when getAttribute returns null for value (line 209 || branch)', () => {
      const el = {
        getName: () => 'agree',
        getAttribute: (k) => k === 'type' ? 'checkbox' : null, // value returns null
        setAttribute: jest.fn()
      };
      form.add(el);
      // value 'on' should match elementValue 'on' (the fallback)
      form.populateValues({ agree: 'on' });
      expect(el.setAttribute).toHaveBeenCalledWith('checked', 'checked');
    });
  });

  // Line 213 FALSE branch: _populateCheckbox array path, element without setAttribute
  describe('_populateCheckbox line 213 false branch', () => {
    it('should not throw when array checkbox element has no setAttribute (line 213 false branch)', () => {
      const el = {
        getName: () => 'tags',
        getAttribute: (k) => k === 'type' ? 'checkbox' : (k === 'value' ? 'red' : null)
        // no setAttribute
      };
      form.add(el);
      expect(() => form.populateValues({ tags: ['red', 'blue'] })).not.toThrow();
    });
  });

  // Line 224 FALSE branch: _populateCheckbox scalar path, element without setAttribute
  describe('_populateCheckbox line 224 false branch (scalar)', () => {
    it('should not throw when scalar checkbox element has no setAttribute (line 224 false branch)', () => {
      const el = {
        getName: () => 'agree',
        getAttribute: (k) => k === 'type' ? 'checkbox' : (k === 'value' ? 'on' : null)
        // no setAttribute
      };
      form.add(el);
      expect(() => form.populateValues({ agree: 'on' })).not.toThrow();
    });
  });

  // Lines 233-242 FALSE branch: _populateRadio with getValueOptions but no setValue
  describe('_populateRadio line 233 false branch', () => {
    it('should not throw when radio group element has no setValue (line 233 false branch)', () => {
      const el = {
        getName: () => 'color',
        getAttribute: (k) => k === 'type' ? 'radio' : null,
        getValueOptions: () => ['red', 'blue']
        // no setValue
      };
      form.add(el);
      expect(() => form.populateValues({ color: 'red' })).not.toThrow();
    });
  });

  // Line 240 FALSE branch: _populateRadio single radio, no getAttribute (null fallback)
  describe('_populateRadio line 240 false branch', () => {
    it('should use null elementValue when single radio has no getAttribute (line 240 false branch)', () => {
      const el = {
        getName: () => 'size',
        // no getAttribute - triggers null fallback at line 240
        setAttribute: jest.fn()
      };
      form.add(el);
      // getAttribute type returns null, so elementType is null → default case, setValue called
      // But if element lacks getAttribute entirely, elementType = null
      // Actually without getAttribute, element has no 'type' → goes to default case in switch
      // Need to get to _populateRadio: require getAttribute to return 'radio'
      // So use an element that has getAttribute returning 'radio' but inside _populateRadio has no getAttribute
      // Let's directly call _populateRadio
      const values = {};
      const radioEl = {
        // no getValueOptions (so goes to single radio path)
        // no getAttribute (triggers null fallback at line 240)
        setAttribute: jest.fn()
      };
      form._populateRadio(radioEl, 'large');
      // elementValue = null, isChecked = (String('large') === String(null)) = ('large' === 'null') = false
      expect(radioEl.setAttribute).toHaveBeenCalledWith('checked', null);
    });
  });

  // Lines 242 FALSE branch: _populateRadio single radio, no setAttribute
  describe('_populateRadio line 242 false branch', () => {
    it('should not throw when single radio element has no setAttribute (line 242 false branch)', () => {
      const el = {
        getName: () => 'size',
        getAttribute: (k) => k === 'type' ? 'radio' : (k === 'value' ? 'large' : null)
        // no getValueOptions, no setAttribute
      };
      form.add(el);
      expect(() => form.populateValues({ size: 'large' })).not.toThrow();
    });
  });

  // Line 248 FALSE branch: _populateSelect element without setValue
  describe('_populateSelect line 248 false branch', () => {
    it('should not throw when select element has no setValue (line 248 false branch)', () => {
      const el = {
        getName: () => 'country',
        getAttribute: (k) => k === 'type' ? 'select' : null
        // no setValue
      };
      form.add(el);
      expect(() => form.populateValues({ country: 'US' })).not.toThrow();
    });
  });

  // Line 285 FALSE branch: _extractCheckboxValue when values[elementName] is already an array
  describe('_extractCheckboxValue line 285 false branch', () => {
    it('should push to existing array when values[elementName] is already an array (line 285 false branch)', () => {
      const values = { colors: ['red'] }; // already an array
      const el = {
        getAttribute: (k) => {
          if (k === 'checked') return 'checked';
          if (k === 'value') return 'blue';
          return null;
        }
      };
      form._extractCheckboxValue(el, 'colors', values);
      expect(values.colors).toEqual(['red', 'blue']);
    });
  });

  // Line 296 FALSE branch: _extractRadioValue getValue returns null (no getValue)
  describe('_extractRadioValue line 296 false branch', () => {
    it('should use null when element has no getValue function (line 296 false branch)', () => {
      const values = {};
      const el = {
        getValueOptions: () => ['a', 'b']
        // no getValue
      };
      form._extractRadioValue(el, 'choice', values);
      // selectedValue is null, so values should not be set
      expect(values.choice).toBeUndefined();
    });
  });

  // Line 310 FALSE branch: _extractDefaultValue when element has no getValue
  describe('_extractDefaultValue line 310 false branch', () => {
    it('should use null when element has no getValue function (line 310 false branch)', () => {
      const values = {};
      const el = {}; // no getValue
      form._extractDefaultValue(el, 'field', values);
      expect(values.field).toBeUndefined();
    });
  });

  // Line 378 FALSE branch: reset with element that is neither checkbox/radio nor has setValue
  describe('reset line 378 false branch', () => {
    it('should not throw when element has no setValue in reset (line 378 false branch)', () => {
      const el = {
        getName: () => 'noSetter2',
        getAttribute: (k) => k === 'type' ? 'text' : null
        // no setValue
      };
      form.add(el);
      expect(() => form.reset()).not.toThrow();
    });
  });
});
