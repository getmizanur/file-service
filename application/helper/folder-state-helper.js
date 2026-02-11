const AbstractHelper = require(global.applicationPath('/library/mvc/view/helper/abstract-helper'));

class FolderStateHelper extends AbstractHelper {

  /**
   * Get the Root Folder ID from the tree dataset
   * @param {Array} folderTree 
   * @returns {string} Root Folder ID
   */
  /**
   * Get the Root Folder ID from the tree dataset
   * @param {Array} folderTree 
   * @returns {string} Root Folder ID
   */
  render(folderTree) {
    if (folderTree && folderTree.length > 0) {
      // Assuming the first item in the tree is the Root (e.g. "Media")
      return folderTree[0].folder_id;
    }
    // Fallback if tree is empty (shouldn't happen with seeded data)
    return 'a1000000-0000-0000-0000-000000000001';
  }
}

module.exports = FolderStateHelper;
