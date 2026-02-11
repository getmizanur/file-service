const path = require('path');
// Dynamically resolve the project root
const projectRoot = path.resolve(__dirname, '../../../');
global.applicationPath = (p) => {
  if (p === '/library/mvc/view/helper/abstract-helper') {
    return path.join(projectRoot, 'library/mvc/view/helper/abstract-helper.js');
  }
  return path.join(projectRoot, p.replace(/^\//, ''));
};

let CategorySidebarHelper;
beforeAll(() => {
  const helperPath = global.applicationPath('/application/helper/category-sidebar-helper');
  CategorySidebarHelper = require(helperPath);
});

describe('CategorySidebarHelper', () => {
  let helper;
  beforeEach(() => {
    helper = new CategorySidebarHelper();
  });

  it('should render default category if none provided', () => {
    const html = helper.render();
    expect(html).toContain('About General');
    expect(html).toContain('Welcome to our category section.');
  });

  it('should render provided category name and description', () => {
    const category = { name: 'Politics', description: 'All about politics.' };
    const html = helper.render(category);
    expect(html).toContain('About Politics');
    expect(html).toContain('All about politics.');
  });

  it('should render mobile sidebar with correct classes', () => {
    const category = { name: 'MobileCat', description: 'Mobile description.' };
    const html = helper.render(category, true);
    expect(html).toContain('visible-phone');
    expect(html).not.toContain('col-sm-4 col-md-4');
  });

  it('should render desktop sidebar with correct classes', () => {
    const category = { name: 'DesktopCat', description: 'Desktop description.' };
    const html = helper.render(category, false);
    expect(html).toContain('hidden-phone');
    expect(html).toContain('col-sm-4 col-md-4');
  });

  it('should show fallback if description is missing', () => {
    const category = { name: 'NoDesc' };
    const html = helper.render(category);
    expect(html).toContain('About NoDesc');
    expect(html).toContain('No description available.');
  });
});
