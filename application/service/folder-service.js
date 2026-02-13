const AbstractService = require('./abstract-service');
const FolderTable = require('../table/folder-table');

/**
 * FolderService - Service class for managing folders
 * Thin orchestration layer: delegates SQL to FolderTable.
 */
class FolderService extends AbstractService {
  constructor() {
    super();
  }

  /**
   * Get FolderTable (data access layer)
   */
  async getFolderTable() {
    const adapter = await this.initializeDatabase();
    return new FolderTable({ adapter });
  }

  /**
   * Fetch folders by user email
   */
  async getFoldersByUserEmail(email) {
    const table = await this.getFolderTable();
    return table.fetchByUserEmail(email);
  }

  /**
   * Fetch folders by parent folder ID
   */
  async getFoldersByParent(parentId, tenantId) {
    const table = await this.getFolderTable();
    return table.fetchByParent(parentId, tenantId);
  }

  /**
   * Fetch a single folder by ID
   */
  async getFolderById(folderId) {
    const table = await this.getFolderTable();
    return table.fetchById(folderId);
  }

  /**
   * Fetch user's folder tree
   * @param {string} email
   * @returns {Array} Tree structure
   */
  async getFolderTreeByUserEmail(email) {
    const folders = await this.getFoldersByUserEmail(email);
    return this._buildFolderTree(folders);
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
  /**
   * Create a new folder
   * @param {string} userEmail
   * @param {string} folderName
   * @param {string|null} parentFolderId
   * @returns {string} New folder ID
   */
  async createFolder(userEmail, folderName, parentFolderId) {
    const adapter = await this.initializeDatabase();
    // Assuming Select and Insert are available or need to be required. 
    // The user provided logic uses 'new Select(db)' and 'new Insert(adapter)'.
    // I need to require them. 
    // Checking where they are located. Based on context, likely library/db/sql/select and insert.

    // Lazy require to avoid circular dependencies if any, or just require at top.
    // For now, I'll require them inside method or at top. 
    // Let's assume they are standard library classes.
    const Select = require(global.applicationPath('/library/db/sql/select'));
    const Insert = require(global.applicationPath('/library/db/sql/insert'));

    // 1. Resolve user_id + tenant_id
    const qUser = new Select(adapter)
      .from({ u: 'app_user' }, [
        'u.user_id',
        'u.email',
        'tm.tenant_id'
      ])
      .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id')
      .where('u.email = ?', userEmail)
      .where("u.status = 'active'");

    const resUser = await qUser.execute();
    const userRows = (resUser && resUser.rows) ? resUser.rows : (Array.isArray(resUser) ? resUser : []);

    if (userRows.length === 0) {
      throw new Error('User not found or inactive');
    }
    const { user_id, tenant_id } = userRows[0];

    // 2. Resolve Parent Folder ID
    // If parentFolderId is provided and valid, usage it.
    // If not, fetch Tenant Root.
    let targetParentId = parentFolderId;

    if (!targetParentId || targetParentId === 'root' || targetParentId === 'a1000000-0000-0000-0000-000000000001') {
      // Check if text is 'root' or specific ID, but logic says:
      // If "New Folder" clicked at root, parent is root.
      // User step 2: Get tenant root folder id (parent_folder_id IS NULL).

      const qRoot = new Select(adapter)
        .from({ f: 'folder' }, ['f.folder_id'])
        .where('f.tenant_id = ?', tenant_id)
        .where('f.parent_folder_id IS NULL')
        .limit(1);

      const resRoot = await qRoot.execute();
      const rootRows = (resRoot && resRoot.rows) ? resRoot.rows : (Array.isArray(resRoot) ? resRoot : []);
      const existingRoot = rootRows[0]?.folder_id;

      if (existingRoot) {
        targetParentId = existingRoot;
      } else {
        // Should create root if missing, but for now assuming it exists or creating it.
        // User provided code to ensure root exists.
        const insRoot = new Insert(adapter)
          .into('folder')
          .values({
            tenant_id,
            parent_folder_id: null,
            name: 'Media',
            created_by: user_id
          })
          .returning(['folder_id']);

        const rRoot = await insRoot.execute();
        targetParentId = rRoot.insertedRecord.folder_id;
      }
    }

    // 3. Create the Folder
    const ins = new Insert(adapter)
      .into('folder')
      .values({
        tenant_id,
        // If targetParentId is the root folder itself, do we set parent_folder_id = rootID?
        // Yes, standard folders have parent. Only Root has null.
        // Wait, "User's root folder is tenant root (parent_folder_id IS NULL)".
        // So if I create a folder UNDER root, I set parent_folder_id = tenantRootId.
        parent_folder_id: targetParentId,
        name: folderName,
        created_by: user_id
      })
      .returning(['folder_id']);

    const r = await ins.execute();

    // Insert.execute now returns normalized object: { insertedId, insertedRecord, ... }
    let newFolderId = null;
    if (r.insertedId) newFolderId = r.insertedId;
    else if (r.insertedRecord && r.insertedRecord.folder_id) newFolderId = r.insertedRecord.folder_id;

    if (newFolderId) {
      await this.logEvent(newFolderId, 'CREATED', {}, user_id);
      return newFolderId;
    }

    return null;
  }

  /**
   * Get the Tenant Root Folder for a specific user (by email)
   * @param {string} email
   * @returns {Promise<object>} Folder object { folder_id, name, ... }
   */
  async getRootFolderByUserEmail(email) {
    const adapter = await this.initializeDatabase();
    const Select = require(global.applicationPath('/library/db/sql/select'));

    // 1. Get Tenant ID
    const qUser = new Select(adapter)
      .from({ u: 'app_user' }, ['tm.tenant_id'])
      .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id')
      .where('u.email = ?', email)
      .where("u.status = 'active'");

    const resUser = await qUser.execute();
    const userRows = (resUser && resUser.rows) ? resUser.rows : (Array.isArray(resUser) ? resUser : []);

    if (userRows.length === 0) {
      throw new Error('User not found');
    }
    const { tenant_id } = userRows[0];

    // 2. Get Root
    const qRoot = new Select(adapter)
      .from({ f: 'folder' }, ['f.*'])
      .where('f.tenant_id = ?', tenant_id)
      .where('f.parent_folder_id IS NULL')
      .limit(1);

    const resRoot = await qRoot.execute();
    const rootRows = (resRoot && resRoot.rows) ? resRoot.rows : (Array.isArray(resRoot) ? resRoot : []);

    return rootRows[0] || null;
  }

  /**
   * Soft delete a folder
   * @param {string} folderId
   * @param {string} userEmail
   * @returns {boolean} True if deleted
   */
  async deleteFolder(folderId, userEmail) {
    const adapter = await this.initializeDatabase();
    // 1. Resolve user
    // Reuse logic from createFolder or extract.
    // Ideally extract, but for safety in this task, I'll inline.
    const Select = require(global.applicationPath('/library/db/sql/select'));
    const qUser = new Select(adapter)
      .from({ u: 'app_user' }, ['u.user_id', 'tm.tenant_id'])
      .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id')
      .where('u.email = ?', userEmail);
    const resUser = await qUser.execute();
    const userRows = (resUser && resUser.rows) ? resUser.rows : (Array.isArray(resUser) ? resUser : []);
    if (userRows.length === 0) throw new Error('User not found');
    const { user_id, tenant_id } = userRows[0];

    // 2. Check if folder belongs to tenant (security check, optional but good)
    const folderTable = await this.getFolderTable();
    const folder = await folderTable.fetchById(folderId);
    if (!folder) throw new Error('Folder not found');

    if (!folder.getParentFolderId()) {
      throw new Error('Cannot delete root folder');
    }

    // Note: getTenantId() might be string/int mismatch?
    if (String(folder.getTenantId()) !== String(tenant_id)) {
      throw new Error('Access denied');
    }

    // 3. Check if empty (sub-folders)
    // 3. Check if empty (sub-folders)
    const subFolders = await folderTable.fetchByParent(folderId, tenant_id);
    if (subFolders.length > 0) {
      throw new Error('Folder is not empty (contains sub-folders)');
    }

    // 4. Check if empty (files)
    // Need FileMetadataService or Table. Using ServiceManager if available or requiring Table directly?
    // FolderService doesn't have direct access to FileMetadataTable.
    // BUT we are in Service Layer. We should use ServiceManager if possible, or lazy load Table.
    // Let's lazy load FileMetadataTable for now.
    const FileMetadataTable = require('../table/file-metadata-table');
    // const fileTable = new FileMetadataTable({ adapter });
    // reuse fetchFilesByFolder? It requires email.
    // Or just count files by folder_id.
    const qFiles = new Select(adapter)
      .from('file_metadata')
      .columns(['file_id'])
      .where('folder_id = ?', folderId)
      .where('deleted_at IS NULL')
      .limit(1);
    const resFiles = await qFiles.execute();
    const fileRows = (resFiles && resFiles.rows) ? resFiles.rows : (Array.isArray(resFiles) ? resFiles : []);

    if (fileRows.length > 0) {
      throw new Error('Folder is not empty (contains files)');
    }

    // 5. Soft Delete
    const now = new Date();
    await folderTable.update(
      { folder_id: folderId },
      { deleted_at: now, deleted_by: user_id }
    );

    await this.logEvent(folderId, 'DELETED', { delete_type: 'soft' }, user_id);

    return true;
  }

  /**
   * Rename a folder
   * @param {string} folderId
   * @param {string} name
   * @param {string} userEmail
   */
  async updateFolder(folderId, name, userEmail) {
    const adapter = await this.initializeDatabase();

    // 1. Validate User
    const Select = require(global.applicationPath('/library/db/sql/select'));
    const qUser = new Select(adapter)
      .from({ u: 'app_user' }, ['u.user_id', 'tm.tenant_id'])
      .join({ tm: 'tenant_member' }, 'tm.user_id = u.user_id')
      .where('u.email = ?', userEmail);
    const resUser = await qUser.execute();
    const userRows = (resUser && resUser.rows) ? resUser.rows : (Array.isArray(resUser) ? resUser : []);

    if (userRows.length === 0) throw new Error('User not found');
    const { user_id, tenant_id } = userRows[0];

    // 2. Validate Folder Ownership
    const folderTable = await this.getFolderTable();
    const folder = await folderTable.fetchById(folderId);

    if (!folder) throw new Error('Folder not found');
    if (String(folder.getTenantId()) !== String(tenant_id)) {
      throw new Error('Access denied');
    }

    // 3. Update Name
    const now = new Date();
    await folderTable.update(
      { folder_id: folderId },
      { name: name }
    ); // Not updating modified_by/dt for simple rename? Or should we? 
    // Start with just name for now, or add modified_at if schema supports it.
    // checked schema in previous turns, base columns don't show modified_at usually for folders, 
    // but let's stick to minimal change.

    await this.logEvent(folderId, 'RENAMED', {
      old_name: folder.getName ? folder.getName() : folder.name,
      new_name: name
    }, user_id);

    return true;
  }

  /**
   * Log a folder event
   * @param {string} folderId
   * @param {string} eventType
   * @param {Object} detail
   * @param {string} userId
   */
  async logEvent(folderId, eventType, detail, userId) {
    const FolderEventEntity = require('../entity/folder-event-entity');

    // Validate event type
    if (!Object.keys(FolderEventEntity.EVENT_TYPE).includes(eventType)) {
      console.warn(`[FolderService] Invalid event type: ${eventType}`);
    }

    const adapter = await this.initializeDatabase();
    const FolderEventTable = require('../table/folder-event-table');
    const eventTable = new FolderEventTable({ adapter });

    await eventTable.insert({
      folder_id: folderId,
      event_type: eventType,
      detail: JSON.stringify(detail),
      actor_user_id: userId,
      created_dt: new Date()
    });
  }
}

module.exports = FolderService;
