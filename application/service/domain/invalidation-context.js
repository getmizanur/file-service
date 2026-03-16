// application/service/domain/invalidation-context.js

/**
 * Collects cache-invalidation intent during a recursive operation
 * (e.g. copyFolder) and flushes once at the end.
 *
 * Usage:
 *   const ctx = new InvalidationContext(sm);
 *   await copyFolder(id, target, email, { invalidationContext: ctx });
 *   // nested copyFile calls mark intent but skip actual invalidation
 *   await ctx.flush();
 */
class InvalidationContext {
  constructor(serviceManager) {
    this.sm = serviceManager;
    this.fileCache = false;
    this.folderCache = false;
    this.suggestionStale = false;
    this.tenantIds = new Set();
    this.userEmails = new Set();
    this.userIds = new Set();
  }

  markFileCache(tenantId) {
    this.fileCache = true;
    this.tenantIds.add(tenantId);
  }

  markFolderCache(tenantId, email) {
    this.folderCache = true;
    this.tenantIds.add(tenantId);
    if (email) this.userEmails.add(email);
  }

  /**
   * Mark suggestion cache as stale for a user.
   * On flush, deletes all rows for the user/tenant so the next
   * home view triggers a full refresh.
   */
  markSuggestionsStale(tenantId, userId) {
    this.suggestionStale = true;
    this.tenantIds.add(tenantId);
    if (userId) this.userIds.add(userId);
  }

  async flush() {
    const qcs = this.sm.get('QueryCacheService');

    if (this.fileCache) {
      for (const tenantId of this.tenantIds) {
        qcs.onFileChanged(tenantId).catch(() => {});
      }
    }

    if (this.folderCache) {
      this._flushFolderCache(qcs);
    }

    if (this.suggestionStale) {
      await this._flushSuggestionCache();
    }
  }

  _flushFolderCache(qcs) {
    for (const tenantId of this.tenantIds) {
      for (const email of this.userEmails) {
        qcs.onFolderChanged(tenantId, email).catch(() => {});
      }
    }
  }

  async _flushSuggestionCache() {
    try {
      const adapter = this.sm.get('DbAdapter');
      for (const tenantId of this.tenantIds) {
        for (const userId of this.userIds) {
          await adapter.query(
            `DELETE FROM user_suggestion_cache WHERE tenant_id = $1 AND user_id = $2`,
            [tenantId, userId]
          ).catch(() => {});
        }
      }
    } catch { /* best-effort */ }
  }
}

module.exports = InvalidationContext;
