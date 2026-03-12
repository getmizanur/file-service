const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../../../');
globalThis.applicationPath = (p) => {
  return path.join(projectRoot, p.replace(/^\//, ''));
};

const IndexActionService = require(globalThis.applicationPath('/application/service/action/index-action-service'));

describe('IndexActionService - Location Annotations', () => {
  let service;

  beforeEach(() => {
    service = new IndexActionService();
  });

  const folders = [
    { folder_id: 'root', name: 'Root', parent_folder_id: null },
    { folder_id: 'docs', name: 'Documents', parent_folder_id: 'root' },
    { folder_id: 'sub', name: 'Subfolder', parent_folder_id: 'docs' },
    { folder_id: 'projects', name: 'Projects', parent_folder_id: 'root' }
  ];

  const toPlain = (item) => item;

  describe('_buildLocationAnnotations()', () => {
    it('annotates files with location and location_path', () => {
      const files = [
        { id: 'f1', name: 'test.pdf', folder_id: 'docs' },
        { id: 'f2', name: 'image.png', folder_id: 'sub' }
      ];
      const subFolders = [];

      service._buildLocationAnnotations(files, subFolders, folders, toPlain);

      expect(files[0].location).toBe('Documents');
      expect(files[0].location_path).toBe('Root / Documents');
      expect(files[1].location).toBe('Subfolder');
      expect(files[1].location_path).toBe('Root / Documents / Subfolder');
    });

    it('annotates folders with location based on parent_folder_id', () => {
      const files = [];
      const subFolders = [
        { folder_id: 'sub', name: 'Subfolder', parent_folder_id: 'docs' },
        { folder_id: 'projects', name: 'Projects', parent_folder_id: 'root' }
      ];

      service._buildLocationAnnotations(files, subFolders, folders, toPlain);

      expect(subFolders[0].location).toBe('Documents');
      expect(subFolders[0].location_path).toBe('Root / Documents');
      expect(subFolders[1].location).toBe('Root');
      expect(subFolders[1].location_path).toBe('Root');
    });

    it('handles files in root folder', () => {
      const files = [
        { id: 'f3', name: 'readme.txt', folder_id: 'root' }
      ];
      const subFolders = [];

      service._buildLocationAnnotations(files, subFolders, folders, toPlain);

      expect(files[0].location).toBe('Root');
      expect(files[0].location_path).toBe('Root');
    });

    it('handles files with unknown folder_id', () => {
      const files = [
        { id: 'f4', name: 'orphan.txt', folder_id: 'unknown-id' }
      ];
      const subFolders = [];

      service._buildLocationAnnotations(files, subFolders, folders, toPlain);

      expect(files[0].location).toBe('');
      expect(files[0].location_path).toBe('');
    });

    it('handles files with no folder_id', () => {
      const files = [
        { id: 'f5', name: 'no-folder.txt' }
      ];
      const subFolders = [];

      service._buildLocationAnnotations(files, subFolders, folders, toPlain);

      expect(files[0].location).toBe('');
    });

    it('handles folders with no parent_folder_id', () => {
      const files = [];
      const subFolders = [
        { folder_id: 'root', name: 'Root', parent_folder_id: null }
      ];

      service._buildLocationAnnotations(files, subFolders, folders, toPlain);

      expect(subFolders[0].location).toBe('');
    });

    it('caches folder path lookups (same folder_id used twice)', () => {
      const files = [
        { id: 'f1', name: 'a.txt', folder_id: 'docs' },
        { id: 'f2', name: 'b.txt', folder_id: 'docs' }
      ];
      const subFolders = [];

      service._buildLocationAnnotations(files, subFolders, folders, toPlain);

      expect(files[0].location_path).toBe('Root / Documents');
      expect(files[1].location_path).toBe('Root / Documents');
    });

    it('handles empty inputs', () => {
      const files = [];
      const subFolders = [];

      // Should not throw
      service._buildLocationAnnotations(files, subFolders, folders, toPlain);
    });

    it('handles deeply nested folders', () => {
      const deepFolders = [
        { folder_id: 'r', name: 'Root', parent_folder_id: null },
        { folder_id: 'a', name: 'A', parent_folder_id: 'r' },
        { folder_id: 'b', name: 'B', parent_folder_id: 'a' },
        { folder_id: 'c', name: 'C', parent_folder_id: 'b' }
      ];
      const files = [
        { id: 'f1', name: 'deep.txt', folder_id: 'c' }
      ];

      service._buildLocationAnnotations(files, [], deepFolders, toPlain);

      expect(files[0].location).toBe('C');
      expect(files[0].location_path).toBe('Root / A / B / C');
    });
  });

  describe('_buildBreadcrumbs()', () => {
    it('builds breadcrumbs for nested folder', () => {
      const crumbs = service._buildBreadcrumbs('sub', 'root', folders);
      expect(crumbs).toEqual([
        { name: 'My Drive', folder_id: 'root' },
        { name: 'Documents', folder_id: 'docs' },
        { name: 'Subfolder', folder_id: 'sub' }
      ]);
    });

    it('builds single breadcrumb for root folder', () => {
      const crumbs = service._buildBreadcrumbs('root', 'root', folders);
      expect(crumbs).toEqual([
        { name: 'My Drive', folder_id: 'root' }
      ]);
    });

    it('returns default when no currentFolderId', () => {
      const crumbs = service._buildBreadcrumbs(null, 'root', folders);
      expect(crumbs).toEqual([{ name: 'My Drive', folder_id: 'root' }]);
    });

    it('returns default when no rootFolderId', () => {
      const crumbs = service._buildBreadcrumbs('docs', null, folders);
      expect(crumbs).toEqual([{ name: 'My Drive', folder_id: null }]);
    });
  });
});
