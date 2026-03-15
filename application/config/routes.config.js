// application/config/routes.config.js
// Routes configuration for the application
// This file defines all the URL routes and their corresponding modules, controllers, and actions
// Note: The 'method' property is sometimes used for documentation but is NOT enforced by the router logic. All routes match on any HTTP method.

module.exports = {
  "routes": {
    "healthCheck": {
      "route": "/health",
      "module": "admin",
      "controller": "rest/health",
      "action": "rest"
    },
    "adminLoginIndex": {
      "route": "/admin/login",
      "module": "admin",
      "controller": "login",
      "action": "index"
    },
    "adminLoginLogout": {
      "route": "/admin/logout",
      "module": "admin",
      "controller": "login",
      "action": "logout"
    },
    "adminUserSearch": {
      "route": "/api/user/search",
      "module": "admin",
      "controller": "rest/user-search",
      "action": "rest"
    },

    "adminHome": {
      "route": "/",
      "module": "admin",
      "controller": "home",
      "action": "list"
    },
    "adminMyDrive": {
      "route": "/my-drive",
      "module": "admin",
      "controller": "my-drive",
      "action": "list"
    },
    "adminSearch": {
      "route": "/search",
      "module": "admin",
      "controller": "search",
      "action": "list"
    },
    "adminRecent": {
      "route": "/recent",
      "module": "admin",
      "controller": "recent",
      "action": "list"
    },
    "adminStarred": {
      "route": "/starred",
      "module": "admin",
      "controller": "starred",
      "action": "list"
    },
    "adminShared": {
      "route": "/shared",
      "module": "admin",
      "controller": "shared",
      "action": "list"
    },
    "adminTrash": {
      "route": "/trash",
      "module": "admin",
      "controller": "trash",
      "action": "list"
    },
    "adminFolderCreate": {
      "route": "/admin/folder/create",
      "module": "admin",
      "controller": "folder",
      "action": "create"
    },
    "adminFolderDelete": {
      "route": "/admin/folder/delete",
      "module": "admin",
      "controller": "folder",
      "action": "delete"
    },
    "adminFolderDownload": {
      "route": "/admin/folder/download",
      "module": "admin",
      "controller": "folder",
      "action": "download"
    },
    "adminFolderUpdate": {
      "route": "/api/folder/update",
      "module": "admin",
      "controller": "rest/folder-update",
      "action": "rest"
    },
    "adminFolderPrefetch": {
      "route": "/api/folder/prefetch",
      "module": "admin",
      "controller": "rest/folder-prefetch",
      "action": "rest"
    },
    "adminViewPrefetch": {
      "route": "/api/view/prefetch",
      "module": "admin",
      "controller": "rest/view-prefetch",
      "action": "rest"
    },
    "adminFolderStateToggle": {
      "route": "/api/folder/state/toggle",
      "module": "admin",
      "controller": "rest/folder-state",
      "action": "rest"
    },
    "adminFolderBreadcrumb": {
      "route": "/api/folder/breadcrumb",
      "module": "admin",
      "controller": "rest/folder-breadcrumb",
      "action": "rest"
    },
    "adminFolderListJson": {
      "route": "/api/folder/list/json",
      "module": "admin",
      "controller": "rest/folder-list",
      "action": "rest"
    },
    "adminFolderStarToggle": {
      "route": "/api/folder/star/toggle",
      "module": "admin",
      "controller": "rest/folder-star",
      "action": "rest"
    },
    "adminFileDelete": {
      "route": "/admin/file/delete",
      "module": "admin",
      "controller": "file",
      "action": "delete"
    },
    "adminFileRestore": {
      "route": "/admin/file/restore",
      "module": "admin",
      "controller": "file",
      "action": "restore"
    },
    "adminFolderRestore": {
      "route": "/admin/folder/restore",
      "module": "admin",
      "controller": "folder",
      "action": "restore"
    },
    "adminFolderMove": {
      "route": "/admin/folder/move",
      "module": "admin",
      "controller": "folder",
      "action": "move"
    },
    "adminFileMove": {
      "route": "/admin/file/move",
      "module": "admin",
      "controller": "file",
      "action": "move"
    },
    "adminFileStar": {
      "route": "/admin/file/star",
      "module": "admin",
      "controller": "file",
      "action": "star"
    },
    "adminFileDownload": {
      "route": "/admin/file/download",
      "module": "admin",
      "controller": "file",
      "action": "download"
    },
    "adminFileView": {
      "route": "/admin/file/view",
      "module": "admin",
      "controller": "file",
      "action": "view"
    },
    "adminFileDerivative": {
      "route": "/admin/file/derivative",
      "module": "admin",
      "controller": "file",
      "action": "derivative"
    },

    "adminItemsCopy": {
      "route": "/api/items/copy",
      "module": "admin",
      "controller": "rest/copy-items",
      "action": "rest"
    },
    "adminItemsMove": {
      "route": "/api/items/move",
      "module": "admin",
      "controller": "rest/move-items",
      "action": "rest"
    },
    "adminItemsTrash": {
      "route": "/api/items/trash",
      "module": "admin",
      "controller": "rest/trash-items",
      "action": "rest"
    },
    "adminItemsCalculateSize": {
      "route": "/api/items/calculate-size",
      "module": "admin",
      "controller": "rest/calculate-size",
      "action": "rest"
    },
    "adminItemsRestore": {
      "route": "/api/items/restore",
      "module": "admin",
      "controller": "rest/restore-items",
      "action": "rest"
    },
    "adminItemsPermanentDelete": {
      "route": "/api/items/permanent-delete",
      "module": "admin",
      "controller": "rest/permanent-delete",
      "action": "rest"
    },
    "adminTrashEmpty": {
      "route": "/api/trash/empty",
      "module": "admin",
      "controller": "rest/empty-trash",
      "action": "rest"
    },
    "adminTrashRestoreAll": {
      "route": "/api/trash/restore-all",
      "module": "admin",
      "controller": "rest/restore-all",
      "action": "rest"
    },
    "adminFileUpload": {
      "route": "/api/file/upload",
      "module": "admin",
      "controller": "rest/file-upload",
      "action": "rest"
    },
    "adminFileUpdate": {
      "route": "/api/file/update",
      "module": "admin",
      "controller": "rest/file-update",
      "action": "rest"
    },
    "adminFilePermissions": {
      "route": "/api/file/permissions/:id",
      "module": "admin",
      "controller": "rest/file-permissions",
      "action": "rest"
    },

    "adminFileShare": {
      "route": "/api/file/share",
      "module": "admin",
      "controller": "rest/file-share",
      "action": "rest"
    },
    "adminFileUnshare": {
      "route": "/api/file/unshare",
      "module": "admin",
      "controller": "rest/file-share",
      "action": "rest"
    },

    "adminFileLinkCreate": {
      "route": "/api/file/link/create",
      "module": "admin",
      "controller": "rest/file-link",
      "action": "rest"
    },
    "adminFileLinkRevoke": {
      "route": "/api/file/link/revoke",
      "module": "admin",
      "controller": "rest/file-link",
      "action": "rest"
    },
    "adminFileLinkCopy": {
      "route": "/api/file/link/copy",
      "module": "admin",
      "controller": "rest/file-link",
      "action": "rest"
    },
    "adminFileLinkPublish": {
      "route": "/api/file/link/publish",
      "module": "admin",
      "controller": "rest/file-link-publish",
      "action": "rest"
    },
    "adminFileLinkTogglePublic": {
      "route": "/api/file/link/toggle-public",
      "module": "admin",
      "controller": "rest/file-link-toggle",
      "action": "rest"
    },


    "publicFileServe": {
      "route": "/p/:public_key",
      "module": "admin",
      "controller": "file",
      "action": "public-serve"
    },
    "publicFileLink": {
      "route": "/s/:token",
      "module": "admin",
      "controller": "file",
      "action": "public-link"
    },
    "publicFileDownload": {
      "route": "/s/:token/download",
      "module": "admin",
      "controller": "file",
      "action": "public-download"
    }
  }
};
