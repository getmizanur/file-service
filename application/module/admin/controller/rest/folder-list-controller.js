const RestController = require(global.applicationPath('/library/mvc/controller/rest-controller'));

class FolderListController extends RestController {

  /**
   * GET /admin/folder/list/json
   */
  async indexAction() {
    try {
      const authService = this.getServiceManager().get('AuthenticationService');
      if (!authService.hasIdentity()) {
        return this.handleException(new Error('Login required'));
      }
      const userEmail = authService.getIdentity().email;
      const folderService = this.getServiceManager().get('FolderService');

      // Fetch folder tree
      const tree = await folderService.getFolderTreeByUserEmail(userEmail);

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

      const json = flatten(tree);

      return this.ok(json);

    } catch (e) {
      console.error('[FolderListController] Error:', e);
      return this.handleException(e);
    }
  }
}

module.exports = FolderListController;
