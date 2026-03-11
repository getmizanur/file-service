const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));
globalThis.applicationPath = global.applicationPath;

/**
 * Dynamic test covering all form-* view helpers.
 * They all follow the same pattern: extend AbstractHelper, render() returns HTML.
 */
const Element = require(path.join(projectRoot, 'library/form/element'));

const simpleFormHelpers = [
  { name: 'form-button', tag: 'input' },
  { name: 'form-file', tag: 'input' },
  { name: 'form-hidden', tag: 'input' },
  { name: 'form-password', tag: 'input' },
  { name: 'form-submit', tag: 'input' },
  { name: 'form-text', tag: 'input' },
  { name: 'form-checkbox', tag: 'input' },
  { name: 'form-csrf', tag: 'input' }
];

describe('Form Helpers (dynamic)', () => {
  simpleFormHelpers.forEach(({ name, tag }) => {
    describe(name, () => {
      let Helper, helper;

      beforeAll(() => {
        Helper = require(path.join(projectRoot, `library/mvc/view/helper/${name}`));
      });

      beforeEach(() => {
        helper = new Helper();
      });

      it('should be constructable', () => {
        expect(helper).toBeDefined();
      });

      it('should return empty string for null element', () => {
        expect(helper.render(null)).toBe('');
      });

      it('should render with element attributes', () => {
        const element = {
          getAttributes: () => ({ name: 'field', value: 'test' })
        };
        const result = helper.render(element);
        expect(result).toContain(`<${tag}`);
        expect(result).toContain('name="field"');
      });

      it('should handle element without getAttributes', () => {
        const result = helper.render({});
        expect(result).toContain(`<${tag}`);
      });

      it('should escape attribute values', () => {
        const element = {
          getAttributes: () => ({ name: 'test', value: '<script>' })
        };
        const result = helper.render(element);
        expect(result).toContain('&lt;script&gt;');
      });

      it('should skip null/false attributes', () => {
        const element = {
          getAttributes: () => ({ name: 'test', hidden: null, disabled: false })
        };
        const result = helper.render(element);
        expect(result).not.toContain('hidden');
        expect(result).not.toContain('disabled');
      });

      it('should render boolean true attributes', () => {
        const element = {
          getAttributes: () => ({ name: 'test', required: true })
        };
        const result = helper.render(element);
        expect(result).toContain('required');
      });
    });
  });
});

describe('FormTextarea', () => {
  const FormTextarea = require(path.join(projectRoot, 'library/mvc/view/helper/form-textarea'));

  it('should return empty for null element', () => {
    const helper = new FormTextarea();
    expect(helper.render(null)).toBe('');
  });

  it('should render textarea with content', () => {
    const helper = new FormTextarea();
    const element = {
      getAttributes: () => ({ name: 'body' }),
      getValue: () => 'Hello <world>'
    };
    const result = helper.render(element);
    expect(result).toContain('<textarea');
    expect(result).toContain('</textarea>');
    expect(result).toContain('Hello &lt;world&gt;');
  });

  it('should remove value and type attributes', () => {
    const helper = new FormTextarea();
    const element = {
      getAttributes: () => ({ name: 'body', type: 'text', value: 'x' }),
      getValue: () => 'content'
    };
    const result = helper.render(element);
    expect(result).not.toContain('type=');
    expect(result).not.toContain('value=');
  });
});

describe('FormLabel', () => {
  const FormLabel = require(path.join(projectRoot, 'library/mvc/view/helper/form-label'));

  it('should render label with attribs object', () => {
    const helper = new FormLabel();
    const result = helper.render({ id: 'name' }, 'Name');
    expect(result).toContain('<label');
    expect(result).toContain('Name');
    expect(result).toContain('for="name"');
  });

  it('should render label with null (default open tag)', () => {
    const helper = new FormLabel();
    const result = helper.render(null, 'Text');
    expect(result).toContain('<label>');
    expect(result).toContain('Text');
  });

  it('should show asterisk for required', () => {
    const helper = new FormLabel();
    const result = helper.render({ required: true }, 'Email');
    expect(result).toContain('dp-required-asterisk');
  });
});

describe('FormError', () => {
  const FormError = require(path.join(projectRoot, 'library/mvc/view/helper/form-error'));

  it('should throw for non-Element', () => {
    const helper = new FormError();
    expect(() => helper.render(null)).toThrow('not an instance of Element');
  });

  it('should render error messages from Element', () => {
    const helper = new FormError();
    const element = new Element('email');
    element.setMessages(['Field is required']);
    const result = helper.render(element);
    expect(result).toContain('Field is required');
    expect(result).toContain('<ul');
    expect(result).toContain('</ul>');
  });

  it('should return empty when no messages', () => {
    const helper = new FormError();
    const element = new Element('field');
    const result = helper.render(element);
    expect(result).toBe('');
  });

  it('should render with custom attributes', () => {
    const helper = new FormError();
    const element = new Element('email');
    element.setMessages(['Required']);
    const result = helper.render(element, { id: 'errors', 'data-field': 'email' });
    expect(result).toContain('id="errors"');
    expect(result).toContain('data-field="email"');
  });

  it('should skip null/undefined/false attributes', () => {
    const helper = new FormError();
    const element = new Element('email');
    element.setMessages(['Required']);
    const result = helper.render(element, { id: null, hidden: false, disabled: undefined });
    expect(result).not.toContain('id=');
    expect(result).not.toContain('hidden');
    expect(result).not.toContain('disabled');
  });

  it('should handle boolean true attributes', () => {
    const helper = new FormError();
    const element = new Element('email');
    element.setMessages(['Required']);
    const result = helper.render(element, { 'aria-live': true });
    expect(result).toContain('aria-live');
    expect(result).not.toContain('aria-live=');
  });

  it('should escape attribute values', () => {
    const helper = new FormError();
    const element = new Element('email');
    element.setMessages(['Required']);
    const result = helper.render(element, { 'data-info': '<script>alert("xss")</script>' });
    expect(result).toContain('&lt;script&gt;');
  });

  it('should render multiple error messages as list items', () => {
    const helper = new FormError();
    const element = new Element('email');
    element.setMessages(['Too short', 'Invalid format']);
    const result = helper.render(element);
    expect(result).toContain('<li>Too short</li>');
    expect(result).toContain('<li>Invalid format</li>');
  });

  it('messageSeparatorString should return closing and opening li tags', () => {
    const helper = new FormError();
    expect(helper.messageSeparatorString()).toBe('</li><li>');
  });

  it('messageCloseString should return closing ul tag', () => {
    const helper = new FormError();
    expect(helper.messageCloseString()).toBe('</ul>');
  });

  it('messageOpenFormat with no attributes should render default class only', () => {
    const helper = new FormError();
    const result = helper.messageOpenFormat({});
    expect(result).toBe('<ul class="dp-error-message">');
  });
});

describe('Form helpers - branch: getAttributes returns null', () => {
  simpleFormHelpers.forEach(({ name, tag }) => {
    it(`${name}: should handle getAttributes returning null (|| {} fallback)`, () => {
      const Helper = require(path.join(projectRoot, `library/mvc/view/helper/${name}`));
      const helper = new Helper();
      const element = { getAttributes: () => null };
      const result = helper.render(element);
      expect(result).toContain(`<${tag}`);
    });
  });
});

describe('Form helpers - branch: inherited properties skipped via Object.hasOwn', () => {
  simpleFormHelpers.forEach(({ name, tag }) => {
    it(`${name}: should skip inherited attributes`, () => {
      const Helper = require(path.join(projectRoot, `library/mvc/view/helper/${name}`));
      const helper = new Helper();
      const parent = { inherited: 'should-not-appear' };
      const attrs = Object.create(parent);
      attrs.name = 'field';
      const element = { getAttributes: () => attrs };
      const result = helper.render(element);
      expect(result).not.toContain('inherited');
      expect(result).toContain('name="field"');
    });
  });
});

describe('Form helpers - branch: undefined attribute values skipped', () => {
  simpleFormHelpers.forEach(({ name }) => {
    it(`${name}: should skip undefined attribute values`, () => {
      const Helper = require(path.join(projectRoot, `library/mvc/view/helper/${name}`));
      const helper = new Helper();
      const element = { getAttributes: () => ({ name: 'test', extra: undefined }) };
      const result = helper.render(element);
      expect(result).not.toContain('extra');
    });
  });
});

describe('FormSubmit - branch coverage', () => {
  const FormSubmit = require(path.join(projectRoot, 'library/mvc/view/helper/form-submit'));

  it('should add dp-button class when no class exists (line 22)', () => {
    const helper = new FormSubmit();
    const element = { getAttributes: () => ({ name: 'submit', value: 'Save' }) };
    const result = helper.render(element);
    expect(result).toContain('class="dp-button"');
  });

  it('should add dp-button class when class exists but no dp-button (line 24)', () => {
    const helper = new FormSubmit();
    const element = { getAttributes: () => ({ name: 'submit', class: 'btn-primary' }) };
    const result = helper.render(element);
    expect(result).toContain('dp-button');
    expect(result).toContain('btn-primary');
  });

  it('should not duplicate dp-button when already present (line 24)', () => {
    const helper = new FormSubmit();
    const element = { getAttributes: () => ({ name: 'submit', class: 'dp-button btn-lg' }) };
    const result = helper.render(element);
    // Should only have one dp-button
    const match = result.match(/dp-button/g);
    expect(match.length).toBe(1);
  });

  it('should handle getAttributes returning null (line 18)', () => {
    const helper = new FormSubmit();
    const element = { getAttributes: () => null };
    const result = helper.render(element);
    expect(result).toContain('class="dp-button"');
  });
});

describe('FormTextarea - branch coverage', () => {
  const FormTextarea = require(path.join(projectRoot, 'library/mvc/view/helper/form-textarea'));

  it('should handle getAttributes returning null', () => {
    const helper = new FormTextarea();
    const element = { getAttributes: () => null, getValue: () => 'text' };
    const result = helper.render(element);
    expect(result).toContain('<textarea');
    expect(result).toContain('text');
  });

  it('should use getTextContent when getValue returns null (line 38)', () => {
    const helper = new FormTextarea();
    const element = {
      getAttributes: () => ({ name: 'body' }),
      getValue: () => null,
      getTextContent: () => 'fallback content'
    };
    const result = helper.render(element);
    expect(result).toContain('fallback content');
  });

  it('should handle getValue returning null and no getTextContent (line 38-39)', () => {
    const helper = new FormTextarea();
    const element = {
      getAttributes: () => ({ name: 'body' }),
      getValue: () => null
    };
    const result = helper.render(element);
    expect(result).toContain('<textarea');
  });

  it('should handle element without getValue function (line 36)', () => {
    const helper = new FormTextarea();
    const element = {
      getAttributes: () => ({ name: 'body' }),
      getTextContent: () => 'alt content'
    };
    const result = helper.render(element);
    expect(result).toContain('alt content');
  });

  it('should skip inherited attributes via Object.hasOwn (line 55)', () => {
    const helper = new FormTextarea();
    const parent = { inherited: 'nope' };
    const attrs = Object.create(parent);
    attrs.name = 'body';
    const element = { getAttributes: () => attrs, getValue: () => '' };
    const result = helper.render(element);
    expect(result).not.toContain('inherited');
  });

  it('should handle class dedup (line 48-50)', () => {
    const helper = new FormTextarea();
    const element = {
      getAttributes: () => ({ name: 'body', class: 'foo foo bar' }),
      getValue: () => ''
    };
    const result = helper.render(element);
    expect(result).toContain('class="foo bar"');
  });
});

describe('FormRadio', () => {
  const FormRadio = require(path.join(projectRoot, 'library/mvc/view/helper/form-radio'));

  it('should return empty for null element', () => {
    const helper = new FormRadio();
    expect(helper.render(null)).toBe('');
  });

  it('should render radio with getAttribute function', () => {
    const helper = new FormRadio();
    const element = {
      getAttribute: (key) => ({ name: 'choice', type: 'radio' }[key]),
      getValueOptions: () => [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' }
      ],
      getValue: () => 'a'
    };
    const result = helper.render(element);
    expect(result).toContain('<input');
    expect(result).toContain('type="radio"');
    expect(result).toContain('Option A');
  });

  it('should render single radio with valueOption', () => {
    const helper = new FormRadio();
    const element = {
      getAttribute: (key) => ({ name: 'choice', type: 'radio' }[key]),
      getValue: () => 'a'
    };
    const result = helper.render(element, { value: 'a', attributes: {} });
    expect(result).toContain('checked="checked"');
  });
});
