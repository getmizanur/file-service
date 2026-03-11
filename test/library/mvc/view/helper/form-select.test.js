const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

const FormSelect = require(path.join(projectRoot, 'library/mvc/view/helper/form-select'));

describe('FormSelect', () => {
  let helper;

  beforeEach(() => {
    helper = new FormSelect();
  });

  it('should return empty for null element', () => {
    expect(helper.render(null)).toBe('');
  });

  it('should render select with options', () => {
    const element = {
      getAttributes: () => ({ name: 'country', value: 'us' }),
      getEmptyOption: () => null,
      getOptions: () => [
        { value: 'us', label: 'United States' },
        { value: 'uk', label: 'United Kingdom' }
      ]
    };
    const result = helper.render(element);
    expect(result).toContain('<select');
    expect(result).toContain('name="country"');
    expect(result).toContain('</select>');
    expect(result).toContain('United States');
    expect(result).toContain('selected="selected"');
  });

  it('should render empty option', () => {
    const element = {
      getAttributes: () => ({ name: 'size' }),
      getEmptyOption: () => ({ value: '', label: 'Select...' }),
      getOptions: () => []
    };
    const result = helper.render(element);
    expect(result).toContain('Select...');
  });

  it('should handle array selectedValue', () => {
    expect(helper.isSelected([1, 2, 3], 2)).toBe(true);
    expect(helper.isSelected([1, 2, 3], 5)).toBe(false);
  });

  it('should handle null selectedValue', () => {
    expect(helper.isSelected(null, 'a')).toBe(false);
    expect(helper.isSelected(undefined, 'a')).toBe(false);
  });

  it('should compare as strings', () => {
    expect(helper.isSelected('1', 1)).toBe(true);
  });

  it('should handle extra attributes', () => {
    const element = {
      getAttributes: () => ({ name: 'test', class: 'foo foo bar' }),
      getEmptyOption: () => null,
      getOptions: () => []
    };
    const result = helper.render(element);
    // Deduped classes
    expect(result).toContain('class="foo bar"');
  });

  it('should handle option with custom attributes', () => {
    const element = {
      getAttributes: () => ({ name: 'test' }),
      getEmptyOption: () => null,
      getOptions: () => [
        { value: '1', label: 'One', attributes: { disabled: true } }
      ]
    };
    const result = helper.render(element);
    expect(result).toContain('disabled');
  });

  it('should handle element without getAttributes', () => {
    const element = {
      getEmptyOption: () => null,
      getOptions: () => []
    };
    const result = helper.render(element);
    expect(result).toContain('<select');
  });

  // --- Branch coverage ---
  it('should handle getAttributes returning null (line 37)', () => {
    const element = {
      getAttributes: () => null,
      getEmptyOption: () => null,
      getOptions: () => []
    };
    const result = helper.render(element);
    expect(result).toContain('<select');
  });

  it('should handle getOptions returning null (line 75)', () => {
    const element = {
      getAttributes: () => ({ name: 'test' }),
      getEmptyOption: () => null,
      getOptions: () => null
    };
    const result = helper.render(element);
    expect(result).toContain('</select>');
  });

  it('should handle element without getOptions function (line 75)', () => {
    const element = {
      getAttributes: () => ({ name: 'test' }),
      getEmptyOption: () => null
    };
    const result = helper.render(element);
    expect(result).toContain('<select');
  });

  it('should handle element without getEmptyOption function (line 67)', () => {
    const element = {
      getAttributes: () => ({ name: 'test' }),
      getOptions: () => []
    };
    const result = helper.render(element);
    expect(result).toContain('<select');
  });

  it('should handle empty option with undefined value and label (lines 69-70)', () => {
    const element = {
      getAttributes: () => ({ name: 'test' }),
      getEmptyOption: () => ({}),
      getOptions: () => []
    };
    const result = helper.render(element);
    expect(result).toContain('<option value="">');
  });

  it('should handle option with undefined value (line 84)', () => {
    const element = {
      getAttributes: () => ({ name: 'test' }),
      getEmptyOption: () => null,
      getOptions: () => [{}]
    };
    const result = helper.render(element);
    expect(result).toContain('<option value="">');
  });

  it('should handle option with value but no label (line 85)', () => {
    const element = {
      getAttributes: () => ({ name: 'test' }),
      getEmptyOption: () => null,
      getOptions: () => [{ value: '42' }]
    };
    const result = helper.render(element);
    expect(result).toContain('>42</option>');
  });

  it('should skip inherited attrs in _serializeAttribs (line 57)', () => {
    const parent = { inherited: 'nope' };
    const attrs = Object.create(parent);
    attrs.name = 'field';
    const result = helper._serializeAttribs(attrs);
    expect(result).toContain('name="field"');
    expect(result).not.toContain('inherited');
  });

  it('should handle boolean/null/false in _serializeAttribs (lines 59-60)', () => {
    const result = helper._serializeAttribs({
      required: true,
      disabled: false,
      hidden: null,
      name: 'test'
    });
    expect(result).toContain('required ');
    expect(result).toContain('name="test"');
    expect(result).not.toContain('disabled');
    expect(result).not.toContain('hidden');
  });

  it('should handle option without attributes object (line 90)', () => {
    const element = {
      getAttributes: () => ({ name: 'test' }),
      getEmptyOption: () => null,
      getOptions: () => [{ value: '1', label: 'One' }]
    };
    const result = helper.render(element);
    expect(result).toContain('One</option>');
    expect(result).not.toContain('disabled');
  });

  it('should render with extra attributes overriding element', () => {
    const element = {
      getAttributes: () => ({ name: 'test' }),
      getEmptyOption: () => null,
      getOptions: () => []
    };
    const result = helper.render(element, { id: 'sel1' });
    expect(result).toContain('id="sel1"');
  });
});
