const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../../');
globalThis.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const InvalidationContext = require(path.join(
  projectRoot, 'application/service/domain/invalidation-context'
));

describe('InvalidationContext', () => {
  let mockQcs;
  let mockDbAdapter;
  let mockSm;

  beforeEach(() => {
    mockQcs = {
      onFileChanged: jest.fn().mockResolvedValue(undefined),
      onFolderChanged: jest.fn().mockResolvedValue(undefined),
    };
    mockDbAdapter = {
      query: jest.fn().mockResolvedValue({}),
    };
    mockSm = {
      get: jest.fn((name) => {
        if (name === 'QueryCacheService') return mockQcs;
        if (name === 'DbAdapter') return mockDbAdapter;
        return null;
      }),
    };
  });

  describe('markFileCache', () => {
    it('records file cache intent and tenant', () => {
      const ctx = new InvalidationContext(mockSm);
      ctx.markFileCache('t1');
      expect(ctx.fileCache).toBe(true);
      expect(ctx.tenantIds.has('t1')).toBe(true);
    });
  });

  describe('markFolderCache', () => {
    it('records folder cache intent, tenant and email', () => {
      const ctx = new InvalidationContext(mockSm);
      ctx.markFolderCache('t1', 'user@test.com');
      expect(ctx.folderCache).toBe(true);
      expect(ctx.tenantIds.has('t1')).toBe(true);
      expect(ctx.userEmails.has('user@test.com')).toBe(true);
    });

    it('handles null email gracefully', () => {
      const ctx = new InvalidationContext(mockSm);
      ctx.markFolderCache('t1', null);
      expect(ctx.userEmails.size).toBe(0);
    });
  });

  describe('markSuggestionsStale', () => {
    it('records suggestion staleness, tenant and userId', () => {
      const ctx = new InvalidationContext(mockSm);
      ctx.markSuggestionsStale('t1', 'u1');
      expect(ctx.suggestionStale).toBe(true);
      expect(ctx.tenantIds.has('t1')).toBe(true);
      expect(ctx.userIds.has('u1')).toBe(true);
    });
  });

  describe('flush()', () => {
    it('calls onFileChanged once per tenant when file cache is marked', async () => {
      const ctx = new InvalidationContext(mockSm);
      ctx.markFileCache('t1');
      ctx.markFileCache('t2');
      ctx.markFileCache('t1'); // duplicate

      await ctx.flush();

      expect(mockQcs.onFileChanged).toHaveBeenCalledTimes(2);
      expect(mockQcs.onFileChanged).toHaveBeenCalledWith('t1');
      expect(mockQcs.onFileChanged).toHaveBeenCalledWith('t2');
    });

    it('calls onFolderChanged for each tenant+email combo when folder cache is marked', async () => {
      const ctx = new InvalidationContext(mockSm);
      ctx.markFolderCache('t1', 'a@test.com');
      ctx.markFolderCache('t1', 'b@test.com');

      await ctx.flush();

      expect(mockQcs.onFolderChanged).toHaveBeenCalledTimes(2);
      expect(mockQcs.onFolderChanged).toHaveBeenCalledWith('t1', 'a@test.com');
      expect(mockQcs.onFolderChanged).toHaveBeenCalledWith('t1', 'b@test.com');
    });

    it('does not call onFileChanged when file cache is not marked', async () => {
      const ctx = new InvalidationContext(mockSm);
      ctx.markFolderCache('t1', 'a@test.com');

      await ctx.flush();

      expect(mockQcs.onFileChanged).not.toHaveBeenCalled();
    });

    it('does not call onFolderChanged when folder cache is not marked', async () => {
      const ctx = new InvalidationContext(mockSm);
      ctx.markFileCache('t1');

      await ctx.flush();

      expect(mockQcs.onFolderChanged).not.toHaveBeenCalled();
    });

    it('deletes suggestion cache for each tenant+user combo when stale', async () => {
      const ctx = new InvalidationContext(mockSm);
      ctx.markSuggestionsStale('t1', 'u1');
      ctx.markSuggestionsStale('t1', 'u2');

      await ctx.flush();

      expect(mockDbAdapter.query).toHaveBeenCalledTimes(2);
      expect(mockDbAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_suggestion_cache'),
        ['t1', 'u1']
      );
      expect(mockDbAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_suggestion_cache'),
        ['t1', 'u2']
      );
    });

    it('does not delete suggestions when not stale', async () => {
      const ctx = new InvalidationContext(mockSm);
      ctx.markFileCache('t1');

      await ctx.flush();

      expect(mockDbAdapter.query).not.toHaveBeenCalled();
    });

    it('handles onFileChanged rejection gracefully', async () => {
      mockQcs.onFileChanged.mockRejectedValue(new Error('redis down'));
      const ctx = new InvalidationContext(mockSm);
      ctx.markFileCache('t1');

      // Should not throw
      await ctx.flush();
    });

    it('handles suggestion delete failure gracefully', async () => {
      mockDbAdapter.query.mockRejectedValue(new Error('db error'));
      const ctx = new InvalidationContext(mockSm);
      ctx.markSuggestionsStale('t1', 'u1');

      // Should not throw
      await ctx.flush();
    });

    it('flushes all types together in a combined scenario', async () => {
      const ctx = new InvalidationContext(mockSm);
      ctx.markFileCache('t1');
      ctx.markFolderCache('t1', 'user@test.com');
      ctx.markSuggestionsStale('t1', 'u1');

      await ctx.flush();

      expect(mockQcs.onFileChanged).toHaveBeenCalledWith('t1');
      expect(mockQcs.onFolderChanged).toHaveBeenCalledWith('t1', 'user@test.com');
      expect(mockDbAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_suggestion_cache'),
        ['t1', 'u1']
      );
    });
  });
});
