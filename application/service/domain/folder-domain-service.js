// application/service/domain/folder-domain-service.js
const AbstractDomainService = require('../abstract-domain-service');

class FolderService extends AbstractDomainService {
  _invalidateFolderCache(tenantId, email) {
    this.getServiceManager().get('QueryCacheService').onFolderChanged(tenantId, email).catch(() => {});
  }

  _invalidateSuggestionCache(tenantId, userId) {
    this.getServiceManager().get('DbAdapter').query(
      `DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    ).catch(() => {});
  }

  // ------------------------------------------------------------
  // Simple delegations to table
  // ------------------------------------------------------------

  async getFoldersByUserEmail(email) {
    return this.getTable('FolderTable').fetchByUserEmail(email);
  }

  async getFoldersByTenant(tenantId) {
    return this.getTable('FolderTable').fetchByTenant(tenantId);
  }

  async getRecentFolders(userEmail, limit = 20) {
    const { tenant_id } = await this.getServiceManager().get('AppUserTable').resolveByEmail(userEmail);
    return this.getServiceManager().get('FolderEventTable').fetchRecentByTenant(tenant_id, limit);
  }

  async getTrashedFolders(userEmail) {
    return this.getTable('FolderTable').fetchDeletedFolders(userEmail);
  }

  async getFoldersByParent(parentId, tenantId, sortMode = 'name') {
    return this.getTable('FolderTable').fetchByParent(parentId, tenantId, sortMode);
  }

  async searchFolders(tenantId, userId, searchTerm, limit = 50, { intitle = null, allintitle = null, author = null } = {}) {
    return this.getTable('FolderTable').fetchSearchResults(tenantId, userId, searchTerm, limit, { intitle, allintitle, author });
  }

  async getFolderById(folderId) {
    return this.getTable('FolderTable').fetchById(folderId);
  }

  async getFolderTreeByUserEmail(email) {
    const folders = await this.getFoldersByUserEmail(email);
    return this.buildFolderTree(folders);
  }

  async getFolderTreeByTenant(tenantId) {
    const folders = await this.getFoldersByTenant(tenantId);
    return this.buildFolderTree(folders);
  }

  async getRootFolderWithContext(email) {
    const sm = this.getServiceManager();
    const { user_id, tenant_id } = await sm.get('AppUserTable').resolveByEmail(email);
    const folderTable = this.getTable('FolderTable');

    let rootFolder = await folderTable.fetchRootByTenantId(tenant_id);
    if (!rootFolder) {
      const newFolderId = await folderTable.create({
        tenant_id, parent_folder_id: null, name: 'Media', created_by: user_id
      });
      rootFolder = await folderTable.fetchById(newFolderId);
    }

    return { rootFolder, user_id, tenant_id };
  }

  buildFolderTree(folders) {
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
      this._invalidateFolderCache(tenant_id, userEmail);
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
    this._invalidateFolderCache(tenant_id, userEmail);

    return true;
  }

  /**
   * Soft-delete a folder and all its contents recursively.
   * Unlike deleteFolder(), this succeeds even when the folder is non-empty.
   */
  async trashFolder(folderId, userEmail, _resolvedContext = null) {
    const sm = this.getServiceManager();

    // Resolve user once at the top level; pass context down for recursion
    const ctx = _resolvedContext || await sm.get('AppUserTable').resolveByEmail(userEmail);
    const { user_id, tenant_id } = ctx;

    const folderTable = this.getTable('FolderTable');
    const folder = await folderTable.fetchById(folderId);
    if (!folder) throw new Error('Folder not found');
    if (!folder.getParentFolderId()) throw new Error('Cannot trash root folder');
    if (String(folder.getTenantId()) !== String(tenant_id)) throw new Error('Access denied');

    const now = new Date();

    // Recursively trash child folders first
    const children = await folderTable.fetchByParent(folderId, tenant_id);
    for (const child of children) {
      const childId = typeof child.getFolderId === 'function' ? child.getFolderId() : child.folder_id;
      await this.trashFolder(childId, userEmail, ctx);
    }

    // Soft-delete all files in this folder
    const fileTable = sm.get('FileMetadataTable');
    const filesResult = await fileTable.fetchFilesByFolder(userEmail, folderId);
    const files = Array.isArray(filesResult) ? filesResult : (filesResult?.rows || []);
    for (const file of files) {
      const fId = file.id || (typeof file.getFileId === 'function' ? file.getFileId() : null);
      if (fId) {
        await fileTable.update({ file_id: fId }, { deleted_at: now, deleted_by: user_id });
        try {
          await sm.get('FileEventTable').insertEvent(fId, 'DELETED', { delete_type: 'soft', trashed_with_folder: folderId }, user_id);
        } catch (e) { /* non-blocking */ }
      }
    }

    // Soft-delete the folder itself
    await folderTable.update(
      { folder_id: folderId },
      { deleted_at: now, deleted_by: user_id }
    );

    await this.logEvent(folderId, 'DELETED', { delete_type: 'soft' }, user_id);
    this._invalidateFolderCache(tenant_id, userEmail);

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
    this._invalidateFolderCache(tenant_id, userEmail);

    return true;
  }

  async copyFolder(folderId, targetParentId, userEmail, { invalidationContext } = {}) {
    const InvalidationContext = require('./invalidation-context');
    const sm = this.getServiceManager();
    const { user_id, tenant_id } = await sm.get('AppUserTable').resolveByEmail(userEmail);
    const folderTable = this.getTable('FolderTable');

    const folder = await folderTable.fetchById(folderId);
    if (!folder) throw new Error('Folder not found');
    if (String(folder.getTenantId()) !== String(tenant_id)) throw new Error('Access denied');

    const target = await folderTable.fetchById(targetParentId);
    if (!target) throw new Error('Target parent folder not found');
    if (String(target.getTenantId()) !== String(tenant_id)) throw new Error('Access denied to target folder');

    // Top-level call owns the context; nested calls reuse it
    const isTopLevel = !invalidationContext;
    const ctx = invalidationContext || new InvalidationContext(sm);

    // Create the copy
    const newFolderId = await folderTable.create({
      tenant_id,
      parent_folder_id: targetParentId,
      name: folder.getName(),
      created_by: user_id
    });

    // Recursively copy subfolders — pass context to suppress nested invalidation
    const children = await folderTable.fetchByParent(folderId, tenant_id);
    for (const child of children) {
      const childId = typeof child.getFolderId === 'function' ? child.getFolderId() : child.folder_id;
      await this.copyFolder(childId, newFolderId, userEmail, { invalidationContext: ctx });
    }

    // Copy files in this folder — pass context to suppress nested invalidation
    const fileService = sm.get('FileMetadataService');
    const fileTable = sm.get('FileMetadataTable');
    const files = await fileTable.fetchFilesByFolder(userEmail, folderId);
    const fileRows = files?.rows ? files.rows : (Array.isArray(files) ? files : []);

    for (const file of fileRows) {
      const fId = file.file_id || (typeof file.getFileId === 'function' ? file.getFileId() : file.id);
      if (fId) {
        await fileService.copyFile(fId, newFolderId, userEmail, { invalidationContext: ctx });
      }
    }

    await this.logEvent(newFolderId, 'COPIED', {
      source_folder_id: folderId,
      target_parent_id: targetParentId
    }, user_id);

    // Mark intent — only the top-level call flushes
    ctx.markFolderCache(tenant_id, userEmail);
    ctx.markFileCache(tenant_id);
    ctx.markSuggestionsStale(tenant_id, user_id);

    if (isTopLevel) {
      await ctx.flush();
    }

    return newFolderId;
  }

  async moveFolder(folderId, targetParentId, userEmail, { invalidationContext } = {}) {
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

    // Prevent moving into itself
    if (String(folderId) === String(targetParentId)) {
      throw new Error('Cannot move a folder into itself');
    }

    // Prevent cyclic move (moving a folder into its own descendant)
    const isCyclic = await folderTable.isDescendantOf(tenant_id, targetParentId, folderId);
    if (isCyclic) {
      throw new Error('Cannot move a folder into one of its subfolders');
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

    if (invalidationContext) {
      invalidationContext.markFolderCache(tenant_id, userEmail);
      invalidationContext.markSuggestionsStale(tenant_id, user_id);
    } else {
      this._invalidateFolderCache(tenant_id, userEmail);
      this._invalidateSuggestionCache(tenant_id, user_id);
    }

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
    this._invalidateFolderCache(tenant_id, userEmail);

    return true;
  }

  async permanentDeleteFolder(folderId, userEmail) {
    const sm = this.getServiceManager();
    const { user_id, tenant_id } = await sm.get('AppUserTable').resolveByEmail(userEmail);
    const folderTable = this.getTable('FolderTable');

    const folder = await folderTable.fetchByIdIncludeDeleted(folderId);
    if (!folder) throw new Error('Folder not found');
    if (!folder.getParentFolderId()) throw new Error('Cannot permanently delete root folder');
    if (String(folder.getTenantId()) !== String(tenant_id)) throw new Error('Access denied');
    if (!folder.getDeletedAt()) throw new Error('Folder is not in trash');

    // Get the full subtree (folder + all descendants, including non-trashed children)
    const allFolderIds = await folderTable.fetchAllDescendantFolderIds(folderId, tenant_id);

    const fileTable = sm.get('FileMetadataTable');
    const adapter = fileTable.getAdapter();

    // Audit all files and folders in the subtree BEFORE hard delete
    // Uses INSERT...SELECT for atomicity — Insert.js does not support this form
    try {
      await adapter.query(
        `INSERT INTO deletion_audit (tenant_id, asset_type, asset_id, object_key, actor_user_id, mode, detail)
         SELECT tenant_id, 'file', file_id, object_key, $1, 'permanent', '{}'::jsonb
         FROM file_metadata
         WHERE tenant_id = $2 AND folder_id = ANY($3::uuid[])`,
        [user_id, tenant_id, allFolderIds]
      );
      await adapter.query(
        `INSERT INTO deletion_audit (tenant_id, asset_type, asset_id, object_key, actor_user_id, mode, detail)
         SELECT tenant_id, 'folder', folder_id, NULL, $1, 'permanent', '{}'::jsonb
         FROM folder
         WHERE folder_id = ANY($2::uuid[])`,
        [user_id, allFolderIds]
      );
    } catch (e) {
      console.error('[FolderService] deletion_audit insert failed:', e.message);
    }

    // Delete all files in those folders first (file_metadata.folder_id → folder ON DELETE SET NULL)
    await adapter.query(
      `DELETE FROM file_metadata WHERE tenant_id = $1 AND folder_id = ANY($2::uuid[])`,
      [tenant_id, allFolderIds]
    );

    // Delete all folders in the subtree
    await folderTable.adapter.query(
      `DELETE FROM folder WHERE folder_id = ANY($1::uuid[])`,
      [allFolderIds]
    );

    this._invalidateFolderCache(tenant_id, userEmail);
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
