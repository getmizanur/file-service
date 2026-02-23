// application/module/admin/controller/rest/folder-list-controller.js
const AdminRestController = require('./admin-rest-controller');

class FolderListController extends AdminRestController {

  /**
   * GET /api/folder/list/json
   */
  async indexAction() {
    try {
      const { email } = await this.requireIdentity();
      const folderService = this.getSm().get('FolderService');

      const tree = await folderService.getFolderTreeByUserEmail(email);

      // Flatten tree with depth info
      const flatten = (nodes, depth = 0, result = []) => {
        nodes.forEach(node => {
          result.push({
            id: node.folder_id,
            name: node.name,
            depth: depth
          });
          if (node.children && node.children.length > 0) {
            flatten(node.children, depth + 1, result);
          }
        });
        return result;
      };

      return this.ok(flatten(tree));
    } catch (e) {
      console.error('[FolderListController] Error:', e);
      return this.handleException(e);
    }
  }
}

module.exports = FolderListController;
