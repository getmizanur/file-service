const AbstractDomainService = require('../abstract-domain-service');

class FolderService extends AbstractDomainService {
  constructor() {
    super();
  }

  // ------------------------------------------------------------
  // Simple delegations to table
  // ------------------------------------------------------------

  async getFoldersByUserEmail(email) {
    return this.getTable('FolderTable').fetchByUserEmail(email);
  }

  async getRecentFolders(userEmail, limit = 20) {
    const { tenant_id } = await this.getServiceManager().get('AppUserTable').resolveByEmail(userEmail);
    return this.getServiceManager().get('FolderEventTable').fetchRecentByTenant(tenant_id, limit);
  }

  async getTrashedFolders(userEmail) {
    return this.getTable('FolderTable').fetchDeletedFolders(userEmail);
  }

  async getFoldersByParent(parentId, tenantId) {
    return this.getTable('FolderTable').fetchByParent(parentId, tenantId);
  }

  async searchFolders(tenantId, userId, searchTerm, limit = 50) {
    return this.getTable('FolderTable').fetchSearchResults(tenantId, userId, searchTerm, limit);
  }

  async getFolderById(folderId) {
    return this.getTable('FolderTable').fetchById(folderId);
  }

  async getFolderTreeByUserEmail(email) {
    const folders = await this.getFoldersByUserEmail(email);
    return this._buildFolderTree(folders);
  }

  _buildFolderTree(folders) {
    const map = {};
    const tree = [];

    folders.forEach(folder => {
      const item = typeof folder.toObject === 'function' ? folder.toObject() : folder;
      item.children = [];
      map[item.folder_id] = item;
    });

    folders.forEach(folder => {
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

  // ------------------------------------------------------------
  // Folder operations
  // ------------------------------------------------------------

  async createFolder(userEmail, folderName, parentFolderId) {
    const sm = this.getServiceManager();
    const { user_id, tenant_id } = await sm.get('AppUserTable').resolveByEmail(userEmail);
    const folderTable = this.getTable('FolderTable');

    let targetParentId = parentFolderId;

    if (!targetParentId || targetParentId === 'root' || targetParentId === 'a1000000-0000-0000-0000-000000000001') {
      const root = await folderTable.fetchRootByTenantId(tenant_id);
      targetParentId = root
        ? root.getFolderId()
        : await folderTable.create({ tenant_id: tenant_id, parent_folder_id: null, name: 'Media', created_by: user_id });
    }

    const newFolderId = await folderTable.create({
      tenant_id: tenant_id,
      parent_folder_id: targetParentId,
      name: folderName,
      created_by: user_id
    });

    if (newFolderId) {
      await this.logEvent(newFolderId, 'CREATED', {}, user_id);
      return newFolderId;
    }

    return null;
  }

  async getRootFolderByUserEmail(email) {
    const sm = this.getServiceManager();
    const { user_id, tenant_id } = await sm.get('AppUserTable').resolveByEmail(email);
    const folderTable = this.getTable('FolderTable');

    const root = await folderTable.fetchRootByTenantId(tenant_id);
    if (root) return root;

    // Create root if missing
    const newFolderId = await folderTable.create({
      tenant_id: tenant_id,
      parent_folder_id: null,
      name: 'Media',
      created_by: user_id
    });

    return folderTable.fetchById(newFolderId);
  }

  async deleteFolder(folderId, userEmail) {
    const sm = this.getServiceManager();
    const { user_id, tenant_id } = await sm.get('AppUserTable').resolveByEmail(userEmail);
    const folderTable = this.getTable('FolderTable');

    const folder = await folderTable.fetchById(folderId);
    if (!folder) throw new Error('Folder not found');

    if (!folder.getParentFolderId()) {
      throw new Error('Cannot delete root folder');
    }

    if (String(folder.getTenantId()) !== String(tenant_id)) {
      throw new Error('Access denied');
    }

    const subFolders = await folderTable.fetchByParent(folderId, tenant_id);
    if (subFolders.length > 0) {
      throw new Error('Folder is not empty (contains sub-folders)');
    }

    const hasFiles = await sm.get('FileMetadataTable').hasFilesByFolder(folderId);
    if (hasFiles) {
      throw new Error('Folder is not empty (contains files)');
    }

    await folderTable.update(
      { folder_id: folderId },
      { deleted_at: new Date(), deleted_by: user_id }
    );

    await this.logEvent(folderId, 'DELETED', { delete_type: 'soft' }, user_id);

    return true;
  }

  async updateFolder(folderId, name, userEmail) {
    const sm = this.getServiceManager();
    const { user_id, tenant_id } = await sm.get('AppUserTable').resolveByEmail(userEmail);
    const folderTable = this.getTable('FolderTable');

    const folder = await folderTable.fetchById(folderId);
    if (!folder) throw new Error('Folder not found');

    if (String(folder.getTenantId()) !== String(tenant_id)) {
      throw new Error('Access denied');
    }

    await folderTable.update(
      { folder_id: folderId },
      { name: name }
    );

    await this.logEvent(folderId, 'RENAMED', {
      old_name: folder.getName(),
      new_name: name
    }, user_id);

    return true;
  }

  async moveFolder(folderId, targetParentId, userEmail) {
    const sm = this.getServiceManager();
    const { user_id, tenant_id } = await sm.get('AppUserTable').resolveByEmail(userEmail);
    const folderTable = this.getTable('FolderTable');

    const folder = await folderTable.fetchById(folderId);
    if (!folder) throw new Error('Folder not found');

    if (!folder.getParentFolderId()) {
      throw new Error('Cannot move root folder');
    }

    if (String(folder.getTenantId()) !== String(tenant_id)) {
      throw new Error('Access denied');
    }

    const target = await folderTable.fetchById(targetParentId);
    if (!target) throw new Error('Target parent folder not found');

    if (String(target.getTenantId()) !== String(tenant_id)) {
      throw new Error('Access denied to target folder');
    }

    const fromParentId = folder.getParentFolderId();

    await folderTable.update(
      { folder_id: folderId },
      { parent_folder_id: targetParentId, updated_by: user_id, updated_dt: new Date() }
    );

    await this.logEvent(folderId, 'MOVED', {
      from_parent_folder_id: fromParentId,
      to_parent_folder_id: targetParentId
    }, user_id);

    return true;
  }

  async restoreFolder(folderId, userEmail) {
    const sm = this.getServiceManager();
    const { user_id, tenant_id } = await sm.get('AppUserTable').resolveByEmail(userEmail);
    const folderTable = this.getTable('FolderTable');

    const folder = await folderTable.fetchByIdIncludeDeleted(folderId);
    if (!folder) throw new Error('Folder not found');

    if (String(folder.getTenantId()) !== String(tenant_id)) {
      throw new Error('Access denied');
    }

    if (!folder.getDeletedAt()) {
      throw new Error('Folder is not deleted');
    }

    const previousDeletedAt = folder.getDeletedAt();
    const previousDeletedBy = folder.getDeletedBy();

    await folderTable.update(
      { folder_id: folderId },
      { deleted_at: null, deleted_by: null, updated_by: user_id, updated_dt: new Date() }
    );

    await this.logEvent(folderId, 'RESTORED', {
      action: 'restored',
      previous_deleted_at: previousDeletedAt,
      previous_deleted_by: previousDeletedBy
    }, user_id);

    return true;
  }

  // ------------------------------------------------------------
  // Events
  // ------------------------------------------------------------

  async logEvent(folderId, eventType, detail, userId) {
    await this.getServiceManager().get('FolderEventTable').insertEvent(folderId, eventType, detail, userId);
  }
}

module.exports = FolderService;
