// application/module/admin/controller/rest/view-prefetch-controller.js
const AdminRestController = require('./admin-rest-controller');

const VIEW_SERVICE_MAP = {
  'home': 'HomeActionService',
  'my-drive': 'MyDriveActionService',
  'shared-with-me': 'SharedActionService',
  'recent': 'RecentActionService',
  'starred': 'StarredActionService',
  'trash': 'TrashActionService'
};

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
      const serviceName = VIEW_SERVICE_MAP[view];

      if (!serviceName) {
        return this.ok({ success: false });
      }

      const sm = this.getSm();
      await sm.get(serviceName).list({
        userEmail: email,
        identity: { email, user_id }
      });

      return this.ok({ success: true });
    } catch {
      // Intentionally ignored - prefetch is best-effort; failure should not affect UI
      return this.ok({ success: false });
    }
  }
}

module.exports = ViewPrefetchController;
