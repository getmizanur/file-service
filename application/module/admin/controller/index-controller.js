const Controller = require(
  global.applicationPath('/library/mvc/controller/base-controller'));
const FolderTable = require(
  global.applicationPath('/application/table/folder-table'));
const PostgreSQLAdapter = require(
  global.applicationPath('/library/db/adapter/postgre-sql-adapter')); // Direct require as fallback

class IndexController extends Controller {

  /**
   * Constructor
   *
   * Initializes the IndexController with optional configuration.
   *
   * @param {Object} options - Controller configuration options
   */
  constructor(options = {}) {
    super(options);
  }

  preDispatch() {

  }

  async indexAction() {
    return this.listAction();
  }

  async listAction() {
    try {
      const viewModel = this.getView();
      const dbAdapter = await this._getDbAdapter();

      console.log("[index-controller] listAction()" + JSON.stringify(dbAdapter));

      // Hardcoded context for now as requested
      // Hardcoded context for now as requested
      // const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const userEmail = 'admin@dailypolitics.com';

      const folderTable = new FolderTable({ adapter: dbAdapter });
      // const folders = await folderTable.fetchByTenant(tenantId);
      // DEBUG: Try fetching by tenant directly to verify data access
      const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const tenantFolders = await folderTable.fetchByTenant(tenantId);
      console.log(`[IndexController] DEBUG: fetchByTenant found ${tenantFolders.length} folders`);

      const folders = await folderTable.fetchByUserEmail(userEmail);
      console.log(`[IndexController] Fetched Folders: ${folders.length}`);
      if (folders.length > 0) {
        console.log(`[IndexController] First Folder: ${JSON.stringify(folders[0])}`);
      }

      const FileMetadataTable = require(global.applicationPath('/application/table/file-metadata-table'));
      const fileMetadataTable = new FileMetadataTable({ adapter: dbAdapter });

      // Determine current folder ID (e.g., from params or root) used for "Files" list
      // For now, we might default to a specific one or null if dealing with root, 
      // but the requirement implies we need a folder_id. 
      // Let's assume for this specific task we might need to be inside a folder or fetching root.
      // However, the query REQUIRES a parent_folder_id. 
      // If we are at root, we might pass 'root' or handle it. 
      // For this implementation, I'll assume we want the root folder's contents or a specific test folder.
      // *Wait*: The UI shows "My Drive". If we click a folder, we'd need that ID.
      // Since this is the `index` (dashboard), maybe we want the root folder contents?
      // Or maybe the user just wants the CAPABILITY.
      // I'll grab the first folder from 'folders' as a mock "current folder" to demonstrate, 
      // OR pass null if the query handles it (it matches = $2).
      // Actually, looking at the query: `f.parent_folder_id = $2`. If $2 is NULL, it won't match standard SQL equality usually.
      // But let's assume valid UUID for now or catch the case. 
      // *Self-correction*: I'll check if `this.getParam('id')` exists, else default to one from the tree or a known ID.
      // For now, to ensure it works without params, I'll try to find the "Media" folder or similar from the fetched folders,
      // OR just use a placeholder ID if no param.

      // Use getQuery for query string parameters (?id=...)
      // Fallback to getParam if it might be a route param in future, or just use getQuery.
      const currentFolderId = this.getQuery('id') || this.getParam('id') || 'a1000000-0000-0000-0000-000000000001'; // Default to 'Media' (Root for tenant)
      console.log(`[IndexController] Current Folder ID: ${currentFolderId}`);

      const filesList = await fileMetadataTable.fetchFilesByFolder(userEmail, currentFolderId);
      console.log(`[IndexController] Files found: ${filesList.length}`);

      const subFolders = await folderTable.fetchByParent(currentFolderId);
      console.log(`[IndexController] Sub-folders found: ${subFolders.length}`);

      viewModel.setVariable('filesList', filesList);
      viewModel.setVariable('subFolders', subFolders);

      const viewMode = this.getQuery('view') || 'grid'; // Default to grid
      viewModel.setVariable('viewMode', viewMode);

      const folderTree = this._buildFolderTree(folders);
      console.log(`[IndexController] Folder Tree built. Top level items: ${folderTree.length}`);

      viewModel.setVariable('folderTree', folderTree);
      viewModel.setVariable('currentFolderId', currentFolderId);

      return viewModel;

    } catch (error) {
      console.error('Error in listAction:', error);
      // Fallback to empty tree/error view if needed
      this.getView().setVariable('folderTree', []);
      return this.getView();
    }
  }

  /**
   * Get Database Adapter
   * Tries to get from ServiceManager, falls back to manual creation
   */
  async _getDbAdapter() {
    try {
      // Try to get from ServiceManager if available (cleaner)
      const sm = this.getServiceManager();
      if (sm && sm.has('DatabaseService')) {
        return await sm.get('DatabaseService').getAdapter();
      }
    } catch (e) {
      // Ignore service manager errors
    }

    // Manual fallback
    const config = this.getServiceManager().get('Config');
    if (!config.database || !config.database.connection) {
      throw new Error('Database config missing');
    }

    console.log("[index-controller] _getDbAdapter()" + JSON.stringify(config.database.connection));
    // We assume PostgreSQL for now as it's the default in config
    const adapter = new PostgreSQLAdapter(config.database.connection);
    await adapter.connect();
    return adapter;
  }

  /**
   * Build hierarchical tree from flat folder list
   * @param {Array} folders 
   * @returns {Array} Tree structure
   */
  _buildFolderTree(folders) {
    const map = {};
    const tree = [];

    // First pass: Map items and initialize children
    folders.forEach(folder => {
      // Convert to plain object if it's an Entity
      const item = typeof folder.toObject === 'function' ? folder.toObject() : folder;
      item.children = [];
      map[item.folder_id] = item;
    });

    // Second pass: Link parents and children
    folders.forEach(folder => {
      // Use original entity Accessor or map. 
      // Since map has plain objects, we access folder_id directly if possible, or use getter from original folder entity
      const folderId = typeof folder.getFolderId === 'function' ? folder.getFolderId() : folder.folder_id;
      const item = map[folderId];

      const parentId = typeof folder.getParentFolderId === 'function' ? folder.getParentFolderId() : folder.parent_folder_id;

      if (parentId && map[parentId]) {
        map[parentId].children.push(item);
      } else {
        tree.push(item);
      }
    });

    return tree;
  }

}

module.exports = IndexController;
