const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const AssetCacheInvalidationListener = require(path.join(
  projectRoot, 'application/listener/asset-cache-invalidation-listener'
));
const AbstractListener = require(path.join(projectRoot, 'library/event/abstract-listener'));

describe('AssetCacheInvalidationListener', () => {
  let listener;
  let mockQcs;
  let mockDb;
  let mockSm;

  beforeEach(() => {
    listener = new AssetCacheInvalidationListener();

    mockQcs = {
      onFileChanged: jest.fn().mockResolvedValue(undefined),
      onFolderChanged: jest.fn().mockResolvedValue(undefined),
      onPermissionChanged: jest.fn().mockResolvedValue(undefined),
    };

    mockDb = {
      query: jest.fn().mockResolvedValue({}),
    };

    mockSm = {
      get: jest.fn((name) => {
        if (name === 'QueryCacheService') return mockQcs;
        if (name === 'DbAdapter') return mockDb;
        return null;
      }),
      has: jest.fn().mockReturnValue(true),
    };

    listener.setServiceManager(mockSm);
  });

  it('should extend AbstractListener', () => {
    expect(listener).toBeInstanceOf(AbstractListener);
  });

  // ------------------------------------------------------------------
  // File events
  // ------------------------------------------------------------------

  describe('file events', () => {
    it('should call onFileChanged for file UPLOADED event', () => {
      listener.handle({ assetType: 'file', eventType: 'UPLOADED', tenantId: 't1' });
      expect(mockQcs.onFileChanged).toHaveBeenCalledWith('t1');
    });

    it('should call onFileChanged for file DELETED event', () => {
      listener.handle({ assetType: 'file', eventType: 'DELETED', tenantId: 't1' });
      expect(mockQcs.onFileChanged).toHaveBeenCalledWith('t1');
    });

    it('should call onFileChanged for file RENAMED event', () => {
      listener.handle({ assetType: 'file', eventType: 'RENAMED', tenantId: 't1' });
      expect(mockQcs.onFileChanged).toHaveBeenCalledWith('t1');
    });

    it('should call onFileChanged for file RESTORED event', () => {
      listener.handle({ assetType: 'file', eventType: 'RESTORED', tenantId: 't1' });
      expect(mockQcs.onFileChanged).toHaveBeenCalledWith('t1');
    });

    it('should call onFileChanged for file MOVED event', () => {
      listener.handle({ assetType: 'file', eventType: 'MOVED', tenantId: 't1', userId: 'u1' });
      expect(mockQcs.onFileChanged).toHaveBeenCalledWith('t1');
    });

    it('should call onFileChanged for file COPIED event', () => {
      listener.handle({ assetType: 'file', eventType: 'COPIED', tenantId: 't1', userId: 'u1' });
      expect(mockQcs.onFileChanged).toHaveBeenCalledWith('t1');
    });

    it('should NOT call onFolderChanged for file events', () => {
      listener.handle({ assetType: 'file', eventType: 'UPLOADED', tenantId: 't1' });
      expect(mockQcs.onFolderChanged).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // Permission events
  // ------------------------------------------------------------------

  describe('permission events', () => {
    it('should call both onFileChanged and onPermissionChanged for PERMISSION_UPDATED', () => {
      listener.handle({ assetType: 'file', eventType: 'PERMISSION_UPDATED', tenantId: 't1' });
      expect(mockQcs.onFileChanged).toHaveBeenCalledWith('t1');
      expect(mockQcs.onPermissionChanged).toHaveBeenCalledWith('t1');
    });

    it('should NOT call onPermissionChanged for non-permission file events', () => {
      listener.handle({ assetType: 'file', eventType: 'UPLOADED', tenantId: 't1' });
      expect(mockQcs.onPermissionChanged).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // Folder events
  // ------------------------------------------------------------------

  describe('folder events', () => {
    it('should call onFolderChanged for folder CREATED event', () => {
      listener.handle({ assetType: 'folder', eventType: 'CREATED', tenantId: 't1', email: 'a@b.com' });
      expect(mockQcs.onFolderChanged).toHaveBeenCalledWith('t1', 'a@b.com');
    });

    it('should call onFolderChanged for folder DELETED event', () => {
      listener.handle({ assetType: 'folder', eventType: 'DELETED', tenantId: 't1', email: 'a@b.com' });
      expect(mockQcs.onFolderChanged).toHaveBeenCalledWith('t1', 'a@b.com');
    });

    it('should call onFolderChanged for folder RENAMED event', () => {
      listener.handle({ assetType: 'folder', eventType: 'RENAMED', tenantId: 't1', email: 'a@b.com' });
      expect(mockQcs.onFolderChanged).toHaveBeenCalledWith('t1', 'a@b.com');
    });

    it('should call onFolderChanged for folder RESTORED event', () => {
      listener.handle({ assetType: 'folder', eventType: 'RESTORED', tenantId: 't1', email: 'a@b.com' });
      expect(mockQcs.onFolderChanged).toHaveBeenCalledWith('t1', 'a@b.com');
    });

    it('should NOT call onFileChanged for folder events', () => {
      listener.handle({ assetType: 'folder', eventType: 'CREATED', tenantId: 't1', email: 'a@b.com' });
      expect(mockQcs.onFileChanged).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // Suggestion cache — user-wide
  // ------------------------------------------------------------------

  describe('suggestion cache (user-wide)', () => {
    it('should clear suggestion cache for file MOVED event with userId', () => {
      listener.handle({ assetType: 'file', eventType: 'MOVED', tenantId: 't1', userId: 'u1' });
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND user_id = $2',
        ['t1', 'u1']
      );
    });

    it('should clear suggestion cache for file COPIED event with userId', () => {
      listener.handle({ assetType: 'file', eventType: 'COPIED', tenantId: 't1', userId: 'u1' });
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND user_id = $2',
        ['t1', 'u1']
      );
    });

    it('should clear suggestion cache for file DELETED event with userId', () => {
      listener.handle({ assetType: 'file', eventType: 'DELETED', tenantId: 't1', userId: 'u1' });
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND user_id = $2',
        ['t1', 'u1']
      );
    });

    it('should clear suggestion cache for file RESTORED event with userId', () => {
      listener.handle({ assetType: 'file', eventType: 'RESTORED', tenantId: 't1', userId: 'u1' });
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND user_id = $2',
        ['t1', 'u1']
      );
    });

    it('should clear suggestion cache for folder MOVED event with userId', () => {
      listener.handle({ assetType: 'folder', eventType: 'MOVED', tenantId: 't1', email: 'a@b.com', userId: 'u1' });
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND user_id = $2',
        ['t1', 'u1']
      );
    });

    it('should NOT clear suggestion cache for UPLOADED event', () => {
      listener.handle({ assetType: 'file', eventType: 'UPLOADED', tenantId: 't1', userId: 'u1' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should NOT clear suggestion cache for RENAMED event', () => {
      listener.handle({ assetType: 'file', eventType: 'RENAMED', tenantId: 't1', userId: 'u1' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should NOT clear suggestion cache when userId is missing', () => {
      listener.handle({ assetType: 'file', eventType: 'MOVED', tenantId: 't1' });
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // Suggestion cache — targeted by asset (publish/unpublish)
  // ------------------------------------------------------------------

  describe('suggestion cache (targeted by asset)', () => {
    it('should clear targeted suggestion cache for PUBLISHED event', () => {
      listener.handle({ assetType: 'file', eventType: 'PUBLISHED', tenantId: 't1', assetId: 'f1' });
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND asset_type = $2 AND asset_id = $3',
        ['t1', 'file', 'f1']
      );
    });

    it('should clear targeted suggestion cache for UNPUBLISHED event', () => {
      listener.handle({ assetType: 'file', eventType: 'UNPUBLISHED', tenantId: 't1', assetId: 'f1' });
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND asset_type = $2 AND asset_id = $3',
        ['t1', 'file', 'f1']
      );
    });

    it('should NOT clear targeted suggestion cache when assetId is missing', () => {
      listener.handle({ assetType: 'file', eventType: 'PUBLISHED', tenantId: 't1' });
      // onFileChanged is called, but not the targeted delete
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // Edge cases
  // ------------------------------------------------------------------

  describe('edge cases', () => {
    it('should return early when tenantId is missing', () => {
      listener.handle({ assetType: 'file', eventType: 'UPLOADED' });
      expect(mockQcs.onFileChanged).not.toHaveBeenCalled();
      expect(mockQcs.onFolderChanged).not.toHaveBeenCalled();
    });

    it('should work with Event objects that have getParams()', () => {
      const event = {
        getParams: () => ({ assetType: 'file', eventType: 'UPLOADED', tenantId: 't1' }),
      };
      listener.handle(event);
      expect(mockQcs.onFileChanged).toHaveBeenCalledWith('t1');
    });
  });
});
