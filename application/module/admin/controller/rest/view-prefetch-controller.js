// application/module/admin/controller/rest/view-prefetch-controller.js
const AdminRestController = require('./admin-rest-controller');

const PREFETCHABLE_VIEWS = ['home', 'my-drive', 'shared-with-me', 'recent', 'starred', 'trash'];

class ViewPrefetchController extends AdminRestController {

  /**
   * POST /api/view/prefetch
   * Warm the query cache for a sidebar view.
   * Fire-and-forget from the browser — response body is irrelevant.
   */
  async postAction() {
    try {
      const { email, user_id } = await this.requireUserContext();
      const view = this.getRequest().getPost('view');

      if (!view || !PREFETCHABLE_VIEWS.includes(view)) {
        return this.ok({ success: false });
      }

      const sm = this.getSm();
      await sm.get('IndexActionService').list({
        userEmail: email,
        identity: { email, user_id },
        folderId: null,
        viewMode: view,
        layoutQuery: null,
        sortQuery: null,
        searchQuery: null,
        page: 1
      });

      return this.ok({ success: true });
    } catch {
      // Intentionally ignored - prefetch is best-effort; failure should not affect UI
      return this.ok({ success: false });
    }
  }
}

module.exports = ViewPrefetchController;
