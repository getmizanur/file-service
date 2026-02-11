const path = require('path');
// Dynamically resolve the project root
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => {
  if (p === '/library/mvc/view/helper/url') {
    return path.join(projectRoot, 'library/mvc/view/helper/url.js');
  }
  if (p === '/library/mvc/view/helper/abstract-helper') {
    return path.join(projectRoot, 'library/mvc/view/helper/abstract-helper.js');
  }
  return path.join(projectRoot, p.replace(/^\//, ''));
};


let CategoryListSidebarHelper;
beforeAll(() => {
  const urlHelperPath = global.applicationPath('/library/mvc/view/helper/url');
  jest.doMock(urlHelperPath, () => {
    return jest.fn().mockImplementation(() => ({
      fromRoute: (route, params) => `/category/${params.category_id}`
    }));
  });
  const helperPath = global.applicationPath('/application/helper/category-list-sidebar-helper');
  CategoryListSidebarHelper = require(helperPath);
});

describe('CategoryListSidebarHelper', () => {
  let helper;
  beforeEach(() => {
    helper = new CategoryListSidebarHelper();
  });

  it('should return empty string if no categories provided', () => {
    expect(helper.render(null)).toBe('');
    expect(helper.render([])).toBe('');
  });

  it('should render a list of categories with post counts', () => {
    const categories = [
      { id: 1, name: 'Politics', slug: 'politics', post_count: 5 },
      { id: 2, name: 'Economy', slug: 'economy', post_count: 2 }
    ];
    const html = helper.render(categories);
    expect(html).toContain('Browse Topics');
    expect(html).toContain('Politics');
    expect(html).toContain('Economy');
    expect(html).toContain('(5)');
    expect(html).toContain('(2)');
    expect(html).toContain('<a href="/category/1">');
    expect(html).toContain('<a href="/category/2">');
  });

  it('should render mobile sidebar with correct classes', () => {
    const categories = [
      { id: 1, name: 'MobileCat', slug: 'mobilecat', post_count: 1 }
    ];
    const html = helper.render(categories, true);
    expect(html).toContain('visible-phone');
    expect(html).not.toContain('col-sm-4 col-md-4');
    expect(html).toContain('id="categories-list-mobile"');
  });

  it('should handle categories without post_count', () => {
    const categories = [
      { id: 3, name: 'NoCount', slug: 'nocount' }
    ];
    const html = helper.render(categories);
    expect(html).toContain('NoCount');
    expect(html).not.toContain('category-post-count');
  });
});
