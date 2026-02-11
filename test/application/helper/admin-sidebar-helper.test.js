
// Mock global.applicationPath for test environment
global.applicationPath = (p) => require('path').join(__dirname, '../../../', p.replace(/^\//, ''));
const AdminSidebarHelper = require('../../../application/helper/admin-sidebar-helper');

describe('AdminSidebarHelper', () => {
  let helper;
  beforeEach(() => {
    helper = new AdminSidebarHelper();
  });

  it('should return HTML string with admin card and default links', () => {
    const html = helper.render();
    expect(typeof html).toBe('string');
    expect(html).toContain('<div class="card admin-dashboard-card">');
    expect(html).toContain('<h3 class="card-header">Admin</h3>');
    expect(html).toContain('<ul class="list-group" id="recent-posts-list">');
    expect(html).toContain('<li class="list-group-item clearfix odd">');
    expect(html).toContain('Settings');
    expect(html).toContain('Posts');
    expect(html).toContain('Users');
  });

  it('should include three default links in the sidebar', () => {
    const html = helper.render();
    // Count occurrences of <li ...> (should be 3)
    const liMatches = html.match(/<li class="list-group-item clearfix odd">/g);
    expect(liMatches).not.toBeNull();
    expect(liMatches.length).toBe(3);
    expect(html).toMatch(/<a href="\/">Settings<\/a>/);
    expect(html).toMatch(/<a href="\/">Posts<\/a>/);
    expect(html).toMatch(/<a href="\/">Users<\/a>/);
  });

  it('should close all HTML tags properly', () => {
    const html = helper.render();
    expect(html).toContain('</ul>');
    expect(html).toContain('</div>');
  });
});
