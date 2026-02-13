# Service Layer Refactoring - 2026-02-11

## Overview
Refactored `IndexController` to separate data access concerns by introducing a Service Layer. This moves `Table` instantiation and logic out of the controller.

## Changes

### 1. New Services
Created `FolderService` and `FileMetadataService` extending `AbstractService`.

**`application/service/folder-service.js`:**
- `getFoldersByUserEmail(email)`
- `getFoldersByParent(parentId)`
- `getFolderById(folderId)`

**`application/service/file-metadata-service.js`:**
- `getFilesByFolder(email, folderId)`

### 2. Configuration
Registered services in `application.config.js`:
```javascript
"invokables": {
  "FolderService": require(global.applicationPath('/application/service/folder-service')),
  "FileMetadataService": require(global.applicationPath('/application/service/file-metadata-service'))
}
```

### 3. Controller Refactoring
Updated `application/module/admin/controller/index-controller.js`:
- Removed `const FolderTable = require(...)`
- Injected services via ServiceManager:
  ```javascript
  const sm = this.getServiceManager();
  const folderService = sm.get('FolderService');
  const fileMetadataService = sm.get('FileMetadataService');
  ```
- Replaced direct `Table` calls with `Service` calls.

## Benefits
- **Decoupling**: Controller no longer manages database adapters or table instances directly.
- **Reusability**: Business logic (if any added later) will reside in Services, usable by other controllers or scripts.
- **Consistency**: follows the `AbstractService` pattern used elsewhere (like `CategoryService` example).
